import { prisma } from "wasp/server";
import express from "express";
import { generateAiResponse } from "../ai/generate";
import { shouldWarnUsage } from "../billing/constants";
import { sendLimitWarningEmail, sendEscalationEmail } from "../billing/emails";
import { isAgentTyping } from "../operations";

const RATE_LIMITS = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = RATE_LIMITS.get(key);
  if (!entry || now > entry.resetAt) {
    RATE_LIMITS.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= max) return false;
  entry.count++;
  return true;
}

function isSpam(text: string): boolean {
  const patterns = [
    /https?:\/\/[^\s]{50,}/gi,
    /(.)\1{25,}/g,
    /<script[\s>]/gi,
    /<iframe[\s>]/gi,
  ];
  return patterns.some((p) => p.test(text));
}

function getDomain(req: express.Request): string | null {
  const origin = req.headers["origin"];
  if (origin) {
    try {
      return new URL(origin).hostname;
    } catch {}
  }
  const referer = req.headers["referer"];
  if (referer) {
    try {
      return new URL(referer).hostname;
    } catch {}
  }
  return null;
}

async function verifyDomain(websiteId: string, domain: string | null): Promise<boolean> {
  const website = await prisma.website.findUnique({ where: { id: websiteId } });
  if (!website) return false;
  // If no allowed domains configured, allow all
  if (website.allowedDomains.length === 0) return true;
  // If domain is null (no headers), reject when domains are configured
  if (!domain) return false;
  return website.allowedDomains.some((d) => domain === d || domain.endsWith("." + d));
}

async function verifyConversationDomain(conversationId: string, domain: string | null): Promise<boolean> {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: { website: true },
  });
  if (!conversation || !conversation.website) return false;
  return verifyDomain(conversation.website.id, domain);
}

function corsHeaders(req: express.Request, res: express.Response) {
  const origin = req.headers["origin"] || "*";
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Max-Age", "86400");
}

export const widgetGetConfig = async (req: express.Request, res: express.Response) => {
  corsHeaders(req, res);
  if (req.method === "OPTIONS") return res.status(204).send();

  try {
    const website = await prisma.website.findUnique({
      where: { id: req.params.websiteId },
      include: {
        agent: { select: { name: true, welcomeMessage: true } },
        triggers: { where: { enabled: true }, select: { id: true, type: true, config: true, message: true, agentId: true } },
      },
    });
    if (!website) return res.status(404).json({ error: "Not found" });
    if (website.status !== "active") return res.status(403).json({ error: "Inactive" });

    // Get org branding for white-label
    const org = await prisma.organization.findUnique({
      where: { id: website.organizationId },
      select: { branding: true },
    });

    let hideBranding = false;
    let companyName = "";
    if (org?.branding && typeof org.branding === "object") {
      const b = org.branding as Record<string, unknown>;
      hideBranding = b.hideBranding === true;
      companyName = (b.companyName as string) || "";
    }

    res.json({
      widgetColor: website.widgetColor,
      widgetPosition: website.widgetPosition,
      widgetTitle: website.widgetTitle,
      widgetAvatarUrl: website.widgetAvatarUrl,
      welcomeMessage: website.widgetWelcomeMessage || website.agent?.welcomeMessage || "Hello! How can I help you today?",
      agentName: website.agent?.name || "AI Assistant",
      triggers: website.triggers.map((t) => ({
        type: t.type,
        config: t.config,
        message: t.message,
      })),
      hideBranding,
      companyName,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal error" });
  }
};

export const widgetInit = async (req: express.Request, res: express.Response) => {
  corsHeaders(req, res);
  if (req.method === "OPTIONS") return res.status(204).send();

  try {
    const { websiteId, sessionId, pageUrl } = req.body || {};
    if (!websiteId || !sessionId) return res.status(400).json({ error: "Missing required fields" });

    const domain = getDomain(req);
    const valid = await verifyDomain(websiteId, domain);
    if (!valid) return res.status(403).json({ error: "Domain not allowed" });

    const ip = req.ip || req.socket.remoteAddress || "unknown";
    if (!checkRateLimit(`init:${ip}`, 10, 60000)) {
      return res.status(429).json({ error: "Too many requests. Please try again later." });
    }

    const visitor = await prisma.visitor.upsert({
      where: { sessionId },
      update: { lastSeenAt: new Date(), ip, userAgent: req.headers["user-agent"] || "", pageUrl },
      create: { sessionId, ip, userAgent: req.headers["user-agent"] || "", pageUrl },
    });

    const website = await prisma.website.findUnique({ where: { id: websiteId } });
    if (!website) return res.status(404).json({ error: "Website not found" });

    const org = await prisma.organization.findUnique({ where: { id: website.organizationId } });
    if (org) {
      const limit = org.monthlyConversationLimit ?? 1000;
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      const conversationCount = await prisma.conversation.count({
        where: { organizationId: org.id, createdAt: { gte: monthStart } },
      });
      if (conversationCount >= limit) {
        return res.status(403).json({ error: "Monthly conversation limit reached. Please upgrade your plan." });
      }
      // Warn at 80% usage (non-blocking)
      if (shouldWarnUsage(conversationCount, limit)) {
        sendLimitWarningEmail(org.id, "conversations", conversationCount, limit).catch(() => {});
      }
    }

    const conversation = await prisma.conversation.create({
      data: {
        organizationId: website.organizationId,
        websiteId: website.id,
        agentId: website.agentId,
        visitorId: visitor.id,
      },
    });

    if (website.widgetWelcomeMessage) {
      await prisma.message.create({
        data: {
          content: website.widgetWelcomeMessage,
          role: "assistant",
          source: "widget",
          conversationId: conversation.id,
        },
      });
    }

    // Update lastMessageAt
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: new Date() },
    });

    res.json({
      conversationId: conversation.id,
      welcomeMessage: website.widgetWelcomeMessage,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal error" });
  }
};

export const widgetSendMessage = async (req: express.Request, res: express.Response) => {
  corsHeaders(req, res);
  if (req.method === "OPTIONS") return res.status(204).send();

  try {
    const { conversationId, content } = req.body || {};
    if (!conversationId) return res.status(400).json({ error: "Missing conversationId" });
    if (!content || !content.trim()) return res.status(400).json({ error: "Missing content" });

    const trimmedContent = content.trim();
    if (trimmedContent.length > 10000) {
      return res.status(400).json({ error: "Message too long (max 10,000 characters)" });
    }

    const ip = req.ip || req.socket.remoteAddress || "unknown";
    if (!checkRateLimit(`msg:${ip}`, 20, 60000)) {
      return res.status(429).json({ error: "Too many requests. Please slow down." });
    }

    if (isSpam(trimmedContent)) return res.status(400).json({ error: "Message rejected as spam" });

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { website: true },
    });
    if (!conversation) return res.status(404).json({ error: "Conversation not found" });
    if (!conversation.website) return res.status(403).json({ error: "Invalid conversation" });

    const domain = getDomain(req);
    const valid = await verifyDomain(conversation.website.id, domain);
    if (!valid) return res.status(403).json({ error: "Domain not allowed" });

    const userMessage = await prisma.message.create({
      data: { content: trimmedContent, role: "user", source: "widget", conversationId },
    });

    // Update lastMessageAt
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date() },
    });

    let message;
    try {
      const result = await generateAiResponse(conversationId, trimmedContent);
      message = { id: result.messageId, content: result.content, createdAt: new Date().toISOString() };
      res.json({
        userMessage: { id: userMessage.id, content: userMessage.content, createdAt: userMessage.createdAt },
        message,
        usage: { tokens: result.tokens, cost: result.cost, model: result.model },
      });
    } catch (aiErr) {
      // Auto-escalate to human on repeated AI failures
      const failedMessages = await prisma.message.count({
        where: { conversationId, status: "error" },
      });
      const shouldEscalate = failedMessages >= 2;

      if (shouldEscalate) {
        await prisma.conversation.update({
          where: { id: conversationId },
          data: { status: "escalated" },
        });
        await prisma.message.create({
          data: {
            content: "Conversation escalated to human support - repeated AI failures",
            role: "system",
            source: "widget",
            conversationId,
          },
        });
        // Send escalation email
        const conv = await prisma.conversation.findUnique({ where: { id: conversationId } });
        if (conv) {
          sendEscalationEmail(conv.organizationId, { id: conversationId }, "Repeated AI failures").catch(() => {});
        }
      }

      const fallbackContent = shouldEscalate
        ? "I'm having trouble answering your question. A human agent will get back to you shortly. You can also leave your email below for faster follow-up."
        : "I'm sorry, I'm having trouble processing your request. Please try again in a moment, or type 'talk to human' to connect with a support agent.";
      const fallback = await prisma.message.create({
        data: { content: fallbackContent, role: "assistant", source: "widget", status: "completed", conversationId },
      });
      res.json({
        userMessage: { id: userMessage.id, content: userMessage.content, createdAt: userMessage.createdAt },
        message: { id: fallback.id, content: fallbackContent, createdAt: fallback.createdAt },
        error: "AI generation failed",
        escalated: shouldEscalate,
      });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal error" });
  }
};

export const widgetGetMessages = async (req: express.Request, res: express.Response) => {
  corsHeaders(req, res);
  if (req.method === "OPTIONS") return res.status(204).send();

  try {
    const { conversationId } = req.params;
    if (!conversationId) return res.status(400).json({ error: "Missing conversationId" });

    const ip = req.ip || req.socket.remoteAddress || "unknown";
    if (!checkRateLimit(`poll:${ip}`, 60, 60000)) {
      return res.status(429).json({ error: "Too many requests" });
    }

    // Verify the conversation belongs to a website accessible from this domain
    const domain = getDomain(req);
    const ownsConversation = await verifyConversationDomain(conversationId, domain);
    if (!ownsConversation) return res.status(403).json({ error: "Access denied" });

    const messages = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: "asc" },
      select: { id: true, content: true, role: true, status: true, createdAt: true },
    });

    res.json({ messages });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal error" });
  }
};

// --- Human Handoff (Phase 18) ---

export const widgetRequestHuman = async (req: express.Request, res: express.Response) => {
  corsHeaders(req, res);
  if (req.method === "OPTIONS") return res.status(204).send();

  try {
    const { conversationId, email, message } = req.body || {};
    if (!conversationId) return res.status(400).json({ error: "Missing conversationId" });

    const ip = req.ip || req.socket.remoteAddress || "unknown";
    if (!checkRateLimit(`handoff:${ip}`, 5, 60000)) {
      return res.status(429).json({ error: "Too many requests. Please try again later." });
    }

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { website: true, organization: true },
    });
    if (!conversation) return res.status(404).json({ error: "Conversation not found" });
    if (!conversation.website) return res.status(403).json({ error: "Invalid conversation" });

    const domain = getDomain(req);
    const valid = await verifyDomain(conversation.website.id, domain);
    if (!valid) return res.status(403).json({ error: "Domain not allowed" });

    // Update conversation status to escalated
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { status: "escalated", lastMessageAt: new Date() },
    });

    // Add system message
    await prisma.message.create({
      data: {
        content: `Human support requested${email ? ` by ${email}` : ""}${message ? `: ${message}` : ""}`,
        role: "system",
        source: "widget",
        conversationId,
      },
    });

    // Update lead with email if provided
    if (email && conversation.leadId) {
      await prisma.lead.update({
        where: { id: conversation.leadId },
        data: { email, status: "new" },
      });
    } else if (email && !conversation.leadId) {
      // Create lead
      const lead = await prisma.lead.create({
        data: {
          email,
          status: "new",
          sourceWebsiteId: conversation.websiteId,
          organizationId: conversation.organizationId,
        },
      });
      await prisma.conversation.update({
        where: { id: conversationId },
        data: { leadId: lead.id },
      });
    }

    // Send escalation email to org members
    sendEscalationEmail(conversation.organizationId, { id: conversationId }, message || "User requested human support").catch(() => {});

    // Add user's message to conversation
    if (message) {
      await prisma.message.create({
        data: { content: message, role: "user", source: "widget", conversationId },
      });
    }

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal error" });
  }
};

// --- Agent Typing Indicator ---

export const widgetIsTyping = async (req: express.Request, res: express.Response) => {
  corsHeaders(req, res);
  if (req.method === "OPTIONS") return res.status(204).send();

  try {
    const { conversationId } = req.params;
    if (!conversationId) return res.status(400).json({ error: "Missing conversationId" });

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { website: true, organization: true },
    });
    if (!conversation || !conversation.website) {
      return res.status(404).json({ error: "Not found" });
    }

    const domain = getDomain(req);
    const valid = await verifyDomain(conversation.website.id, domain);
    if (!valid) return res.status(403).json({ error: "Domain not allowed" });

    const typing = isAgentTyping(conversation.organizationId, conversationId);
    res.json({ isTyping: typing });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal error" });
  }
};
