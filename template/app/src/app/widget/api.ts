import { prisma } from "wasp/server";
import express from "express";
import { generateAiResponse } from "../ai/generate";

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

async function verifyDomain(websiteId: string, domain: string): Promise<boolean> {
  const website = await prisma.website.findUnique({ where: { id: websiteId } });
  if (!website) return false;
  if (website.allowedDomains.length === 0) return true;
  return website.allowedDomains.some((d) => domain === d || domain.endsWith("." + d));
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
      include: { agent: { select: { name: true, welcomeMessage: true } } },
    });
    if (!website) return res.status(404).json({ error: "Not found" });
    if (website.status !== "active") return res.status(403).json({ error: "Inactive" });

    res.json({
      widgetColor: website.widgetColor,
      widgetPosition: website.widgetPosition,
      widgetTitle: website.widgetTitle,
      widgetAvatarUrl: website.widgetAvatarUrl,
      welcomeMessage: website.widgetWelcomeMessage || website.agent?.welcomeMessage || "Hello! How can I help you today?",
      agentName: website.agent?.name || "AI Assistant",
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
    if (domain) {
      const valid = await verifyDomain(websiteId, domain);
      if (!valid) return res.status(403).json({ error: "Domain not allowed" });
    }

    const ip = req.ip || req.socket.remoteAddress || "unknown";
    if (!checkRateLimit(`init:${ip}`, 10, 60000)) {
      return res.status(429).json({ error: "Too many requests. Please try again later." });
    }

    let visitor = await prisma.visitor.findUnique({ where: { sessionId } });
    if (visitor) {
      await prisma.visitor.update({
        where: { id: visitor.id },
        data: { lastSeenAt: new Date(), ip, userAgent: req.headers["user-agent"] || "", pageUrl },
      });
    } else {
      visitor = await prisma.visitor.create({
        data: { sessionId, ip, userAgent: req.headers["user-agent"] || "", pageUrl },
      });
    }

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

    const ip = req.ip || req.socket.remoteAddress || "unknown";
    if (!checkRateLimit(`msg:${ip}`, 20, 60000)) {
      return res.status(429).json({ error: "Too many requests. Please slow down." });
    }

    if (isSpam(content)) return res.status(400).json({ error: "Message rejected as spam" });

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { website: true },
    });
    if (!conversation) return res.status(404).json({ error: "Conversation not found" });
    if (!conversation.website) return res.status(403).json({ error: "Invalid conversation" });

    const domain = getDomain(req);
    if (domain) {
      const valid = await verifyDomain(conversation.website.id, domain);
      if (!valid) return res.status(403).json({ error: "Domain not allowed" });
    }

    const userMessage = await prisma.message.create({
      data: { content: content.trim(), role: "user", source: "widget", conversationId },
    });

    let message;
    try {
      const result = await generateAiResponse(conversationId, content.trim());
      message = { id: result.messageId, content: result.content, createdAt: new Date().toISOString() };
      res.json({
        userMessage: { id: userMessage.id, content: userMessage.content, createdAt: userMessage.createdAt },
        message,
        usage: { tokens: result.tokens, cost: result.cost, model: result.model },
      });
    } catch (aiErr) {
      const fallbackContent = "I'm sorry, I'm having trouble processing your request. Please try again in a moment.";
      const fallback = await prisma.message.create({
        data: { content: fallbackContent, role: "assistant", source: "widget", status: "completed", conversationId },
      });
      res.json({
        userMessage: { id: userMessage.id, content: userMessage.content, createdAt: userMessage.createdAt },
        message: { id: fallback.id, content: fallbackContent, createdAt: fallback.createdAt },
        error: aiErr instanceof Error ? aiErr.message : "AI generation failed",
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
