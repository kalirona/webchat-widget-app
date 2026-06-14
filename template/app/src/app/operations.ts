import { HttpError, prisma } from "wasp/server";
import {
  type CreateOrganization,
  type UpdateOrganization,
  type InviteMember,
  type RemoveMember,
  type GetOrganization,
  type GetOrganizationMembers,
  type GetAgents,
  type GetAgent,
  type GetAgentStats,
  type CreateAgent,
  type UpdateAgent,
  type DeleteAgent,
  type GetWebsites,
  type GetWebsite,
  type CreateWebsite,
  type UpdateWebsite,
  type DeleteWebsite,
  type GetConversations,
  type GetConversationMessages,
  type GetLeads,
  type UpdateLead,
  type DeleteLead,
  type GetDashboardStats,
  type GetAnalyticsData,
  type GetKnowledgeBases,
  type GetKnowledgeBase,
  type GetKnowledgeDocuments,
  type GetAgentKnowledgeBases,
  type CreateKnowledgeBase,
  type DeleteKnowledgeBase,
  type UploadKnowledgeDocument,
  type CrawlUrl,
  type DeleteKnowledgeDocument,
  type LinkAgentToKnowledgeBase,
  type UnlinkAgentFromKnowledgeBase,
  type GetAiSettings,
  type UpdateAiSettings,
  type GetAiUsage,
} from "wasp/server/operations";
import { ensureArgsSchemaOrThrowHttpError } from "../server/validation";
import * as z from "zod";
import crypto from "crypto";
import {
  chunkText,
  extractTextFromBuffer,
  extractHtmlText,
  getFileType,
} from "./knowledge/processing";

function assertUserAndOrg(context: { user?: { id: string } | null }) {
  if (!context.user) {
    throw new HttpError(401, "Not authenticated");
  }
}

async function getOrCreateUserOrg(userId: string) {
  const membership = await prisma.organizationMember.findFirst({
    where: { userId },
    include: { organization: true },
  });
  if (membership) {
    return membership.organization;
  }
  const user = await prisma.user.findUnique({ where: { id: userId } });
  const orgName = user?.username
    ? `${user.username}'s Organization`
    : "My Organization";
  const org = await prisma.organization.create({
    data: { name: orgName },
  });
  await prisma.organizationMember.create({
    data: {
      organizationId: org.id,
      userId,
      role: "owner",
    },
  });
  return org;
}

export const getOrganization: any = async (_args: unknown, context: any) => {
  assertUserAndOrg(context);
  const org = await getOrCreateUserOrg(context.user!.id);
  const members = await prisma.organizationMember.findMany({
    where: { organizationId: org.id },
    include: { user: { select: { id: true, email: true, username: true } } },
  });
  const currentMember = members.find((m) => m.userId === context.user!.id);

  // Count conversations this month
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const conversationsThisMonth = await prisma.conversation.count({
    where: { organizationId: org.id, createdAt: { gte: monthStart } },
  });

  return {
    id: org.id,
    name: org.name,
    logo: org.logo,
    slug: org.slug,
    customDomain: org.customDomain,
    domainVerified: org.domainVerified,
    branding: org.branding,
    role: currentMember?.role ?? "member",
    subscriptionStatus: org.subscriptionStatus,
    subscriptionPlan: org.subscriptionPlan,
    trialEndsAt: org.trialEndsAt,
    monthlyTokenLimit: org.monthlyTokenLimit,
    monthlyConversationLimit: org.monthlyConversationLimit,
    memberLimit: org.memberLimit,
    conversationsThisMonth,
    members: members.map((m) => ({
      id: m.user.id,
      email: m.user.email,
      username: m.user.username,
      role: m.role,
    })),
  };
};

export const getOrganizationMembers: GetOrganizationMembers<void, { id: string; email: string | null; username: string | null; role: string }[]> = async (_args, context) => {
  assertUserAndOrg(context);
  const org = await getOrCreateUserOrg(context.user!.id);
  const members = await prisma.organizationMember.findMany({
    where: { organizationId: org.id },
    include: { user: { select: { id: true, email: true, username: true } } },
  });
  return members.map((m) => ({
    id: m.user.id,
    email: m.user.email,
    username: m.user.username,
    role: m.role,
  }));
};

const createOrganizationSchema = z.object({
  name: z.string().min(1).max(100),
});

export const createOrganization: CreateOrganization<typeof createOrganizationSchema._type, { id: string; name: string }> = async (rawArgs, context) => {
  assertUserAndOrg(context);
  const { name } = ensureArgsSchemaOrThrowHttpError(createOrganizationSchema, rawArgs);
  const org = await prisma.organization.create({ data: { name } });
  await prisma.organizationMember.create({
    data: { organizationId: org.id, userId: context.user!.id, role: "owner" },
  });
  return { id: org.id, name: org.name };
};

const updateOrganizationSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  logo: z.string().optional(),
  slug: z.string().min(3).max(50).regex(/^[a-z0-9-]+$/, "Slug must contain only lowercase letters, numbers, and hyphens").optional(),
  customDomain: z.string().optional(),
  branding: z.record(z.unknown()).optional(),
  monthlyConversationLimit: z.number().int().positive().optional().nullable(),
  memberLimit: z.number().int().positive().optional().nullable(),
});

export const updateOrganization: any = async (rawArgs: unknown, context: any) => {
  assertUserAndOrg(context);
  const data = ensureArgsSchemaOrThrowHttpError(updateOrganizationSchema, rawArgs);
  const org = await getOrCreateUserOrg(context.user!.id);
  const membership = await prisma.organizationMember.findFirst({
    where: { organizationId: org.id, userId: context.user!.id, role: "owner" },
  });
  if (!membership) {
    throw new HttpError(403, "Only the organization owner can update settings");
  }

  // Check slug uniqueness if being updated
  if (data.slug) {
    const existingOrg = await prisma.organization.findFirst({
      where: { slug: data.slug, id: { not: org.id } },
    });
    if (existingOrg) {
      throw new HttpError(409, "This slug is already taken");
    }
  }

  const updateData: Record<string, unknown> = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.logo !== undefined) updateData.logo = data.logo;
  if (data.slug !== undefined) updateData.slug = data.slug;
  if (data.customDomain !== undefined) updateData.customDomain = data.customDomain;
  if (data.branding !== undefined) updateData.branding = data.branding;
  if (data.monthlyConversationLimit !== undefined) updateData.monthlyConversationLimit = data.monthlyConversationLimit;
  if (data.memberLimit !== undefined) updateData.memberLimit = data.memberLimit;

  const updated = await prisma.organization.update({
    where: { id: org.id },
    data: updateData,
  });

  // Log audit event
  await logAuditEvent(org.id, context.user!.id, "organization.updated", { fields: Object.keys(updateData) }, context);

  return {
    id: updated.id,
    name: updated.name,
    logo: updated.logo,
    slug: updated.slug,
    customDomain: updated.customDomain,
    branding: updated.branding,
    monthlyConversationLimit: updated.monthlyConversationLimit,
    memberLimit: updated.memberLimit,
  };
};

const inviteMemberSchema = z.object({
  email: z.string().email(),
});

export const inviteMember: InviteMember<typeof inviteMemberSchema._type, { id: string; email: string; username: string | null; role: string }> = async (rawArgs, context) => {
  assertUserAndOrg(context);
  const { email } = ensureArgsSchemaOrThrowHttpError(inviteMemberSchema, rawArgs);
  const org = await getOrCreateUserOrg(context.user!.id);
  const currentMember = await prisma.organizationMember.findFirst({
    where: { organizationId: org.id, userId: context.user!.id },
  });
  if (!currentMember || currentMember.role !== "owner") {
    throw new HttpError(403, "Only the organization owner can invite members");
  }
  const invitedUser = await prisma.user.findUnique({ where: { email } });
  if (!invitedUser) {
    throw new HttpError(404, "User with this email not found");
  }
  const existing = await prisma.organizationMember.findUnique({
    where: { organizationId_userId: { organizationId: org.id, userId: invitedUser.id } },
  });
  if (existing) {
    throw new HttpError(409, "User is already a member of this organization");
  }
  const member = await prisma.organizationMember.create({
    data: { organizationId: org.id, userId: invitedUser.id, role: "member" },
  });
  return { id: invitedUser.id, email: invitedUser.email!, username: invitedUser.username, role: member.role };
};

const removeMemberSchema = z.object({
  userId: z.string(),
});

export const removeMember: RemoveMember<typeof removeMemberSchema._type, void> = async (rawArgs, context) => {
  assertUserAndOrg(context);
  const { userId } = ensureArgsSchemaOrThrowHttpError(removeMemberSchema, rawArgs);
  const org = await getOrCreateUserOrg(context.user!.id);
  const currentMember = await prisma.organizationMember.findFirst({
    where: { organizationId: org.id, userId: context.user!.id },
  });
  if (!currentMember || currentMember.role !== "owner") {
    throw new HttpError(403, "Only the organization owner can remove members");
  }
  if (userId === context.user!.id) {
    throw new HttpError(400, "Cannot remove yourself");
  }
  const target = await prisma.organizationMember.findUnique({
    where: { organizationId_userId: { organizationId: org.id, userId } },
  });
  if (!target) {
    throw new HttpError(404, "Member not found");
  }
  if (target.role === "owner") {
    throw new HttpError(400, "Cannot remove the owner");
  }
  await prisma.organizationMember.delete({
    where: { organizationId_userId: { organizationId: org.id, userId } },
  });
};

const getAgentsSchema = z.object({
  search: z.string().optional(),
  skip: z.number().int().min(0).optional(),
  pageSize: z.number().int().min(1).max(100).optional(),
});

export const getAgents: GetAgents<typeof getAgentsSchema._type, { agents: { id: string; name: string; description: string | null; model: string; status: string; createdAt: Date; websiteCount: number; conversationCount: number }[]; total: number; totalPages: number }> = async (rawArgs, context) => {
  assertUserAndOrg(context);
  const { search, skip = 0, pageSize = 9 } = ensureArgsSchemaOrThrowHttpError(getAgentsSchema, rawArgs);
  const org = await getOrCreateUserOrg(context.user!.id);
  const where = {
    organizationId: org.id,
    ...(search ? { name: { contains: search, mode: "insensitive" as const } } : {}),
  };
  const [agents, total] = await Promise.all([
    prisma.agent.findMany({
      where,
      include: {
        _count: { select: { websites: true, conversations: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.agent.count({ where }),
  ]);
  return {
    agents: agents.map((a) => ({
      id: a.id,
      name: a.name,
      description: a.description,
      model: a.model,
      status: a.status,
      createdAt: a.createdAt,
      websiteCount: a._count.websites,
      conversationCount: a._count.conversations,
    })),
    total,
    totalPages: Math.ceil(total / pageSize),
  };
};

const getAgentSchema = z.object({
  id: z.string(),
});

export const getAgent: GetAgent<typeof getAgentSchema._type, {
  id: string; name: string; description: string | null; model: string;
  systemPrompt: string; welcomeMessage: string | null; temperature: number;
  status: string; createdAt: Date; updatedAt: Date;
  websiteCount: number; conversationCount: number;
} | null> = async (rawArgs, context) => {
  assertUserAndOrg(context);
  const { id } = ensureArgsSchemaOrThrowHttpError(getAgentSchema, rawArgs);
  const org = await getOrCreateUserOrg(context.user!.id);
  const agent = await prisma.agent.findFirst({
    where: { id, organizationId: org.id },
    include: { _count: { select: { websites: true, conversations: true } } },
  });
  if (!agent) return null;
  return {
    id: agent.id,
    name: agent.name,
    description: agent.description,
    model: agent.model,
    systemPrompt: agent.systemPrompt,
    welcomeMessage: agent.welcomeMessage,
    temperature: agent.temperature,
    status: agent.status,
    createdAt: agent.createdAt,
    updatedAt: agent.updatedAt,
    websiteCount: agent._count.websites,
    conversationCount: agent._count.conversations,
  };
};

const getAgentStatsSchema = z.object({
  id: z.string(),
});

export const getAgentStats: GetAgentStats<typeof getAgentStatsSchema._type, {
  totalConversations: number; totalMessages: number; totalLeads: number;
  todayConversations: number;
} | null> = async (rawArgs, context) => {
  assertUserAndOrg(context);
  const { id } = ensureArgsSchemaOrThrowHttpError(getAgentStatsSchema, rawArgs);
  const org = await getOrCreateUserOrg(context.user!.id);
  const agent = await prisma.agent.findFirst({
    where: { id, organizationId: org.id },
  });
  if (!agent) return null;
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const [totalConversations, totalMessages, totalLeads, todayConversations] =
    await Promise.all([
      prisma.conversation.count({ where: { agentId: id } }),
      prisma.message.count({
        where: { conversation: { agentId: id } },
      }),
      prisma.lead.count({
        where: { conversations: { some: { agentId: id } } },
      }),
      prisma.conversation.count({
        where: { agentId: id, createdAt: { gte: todayStart } },
      }),
    ]);
  return { totalConversations, totalMessages, totalLeads, todayConversations };
};

const createAgentSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  model: z.string().min(1).optional(),
  systemPrompt: z.string().optional(),
  welcomeMessage: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
});

export const createAgent: CreateAgent<typeof createAgentSchema._type, {
  id: string; name: string; description: string | null; model: string;
  systemPrompt: string; welcomeMessage: string | null; temperature: number; status: string;
}> = async (rawArgs, context) => {
  assertUserAndOrg(context);
  const args = ensureArgsSchemaOrThrowHttpError(createAgentSchema, rawArgs);
  const org = await getOrCreateUserOrg(context.user!.id);
  const agent = await prisma.agent.create({
    data: {
      name: args.name,
      description: args.description,
      model: args.model ?? "gpt-4",
      systemPrompt: args.systemPrompt ?? "You are a helpful AI assistant.",
      welcomeMessage: args.welcomeMessage,
      temperature: args.temperature ?? 0.7,
      organizationId: org.id,
    },
  });

  // Log audit event
  await logAuditEvent(org.id, context.user!.id, "agent.created", { agentName: agent.name, agentId: agent.id }, context);

  return {
    id: agent.id, name: agent.name, description: agent.description,
    model: agent.model, systemPrompt: agent.systemPrompt,
    welcomeMessage: agent.welcomeMessage, temperature: agent.temperature,
    status: agent.status,
  };
};

const updateAgentSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  model: z.string().min(1).optional(),
  systemPrompt: z.string().optional(),
  welcomeMessage: z.string().nullable().optional(),
  temperature: z.number().min(0).max(2).optional(),
  status: z.enum(["draft", "active", "paused"]).optional(),
});

export const updateAgent: UpdateAgent<typeof updateAgentSchema._type, {
  id: string; name: string; description: string | null; model: string;
  systemPrompt: string; welcomeMessage: string | null; temperature: number; status: string;
}> = async (rawArgs, context) => {
  assertUserAndOrg(context);
  const { id, ...data } = ensureArgsSchemaOrThrowHttpError(updateAgentSchema, rawArgs);
  const org = await getOrCreateUserOrg(context.user!.id);
  const existingAgent = await prisma.agent.findFirst({
    where: { id, organizationId: org.id },
  });
  if (!existingAgent) throw new HttpError(404, "Agent not found");

  const agent = await prisma.agent.update({ where: { id }, data });

  // Log audit event
  const changedFields = Object.keys(data).filter((key) => {
    const k = key as keyof typeof data;
    return data[k] !== undefined && data[k] !== existingAgent[k as keyof typeof existingAgent];
  });
  if (changedFields.length > 0) {
    await logAuditEvent(org.id, context.user!.id, "agent.updated", {
      agentName: agent.name,
      agentId: id,
      changedFields,
    }, context);
  }

  return {
    id: agent.id, name: agent.name, description: agent.description,
    model: agent.model, systemPrompt: agent.systemPrompt,
    welcomeMessage: agent.welcomeMessage, temperature: agent.temperature,
    status: agent.status,
  };
};

const deleteAgentSchema = z.object({
  id: z.string(),
});

export const deleteAgent: DeleteAgent<typeof deleteAgentSchema._type, void> = async (rawArgs, context) => {
  assertUserAndOrg(context);
  const { id } = ensureArgsSchemaOrThrowHttpError(deleteAgentSchema, rawArgs);
  const org = await getOrCreateUserOrg(context.user!.id);
  const agent = await prisma.agent.findFirst({
    where: { id, organizationId: org.id },
  });
  if (!agent) throw new HttpError(404, "Agent not found");

  // Unlink websites
  await prisma.website.updateMany({
    where: { agentId: id },
    data: { agentId: null },
  });

  // Unlink conversations
  await prisma.conversation.updateMany({
    where: { agentId: id },
    data: { agentId: null },
  });

  // Clean up knowledge base links
  await prisma.agentKnowledgeBase.deleteMany({
    where: { agentId: id },
  });

  // Delete the agent
  await prisma.agent.delete({ where: { id } });

  // Log audit event
  await logAuditEvent(org.id, context.user!.id, "agent.deleted", { agentName: agent.name, agentId: id }, context);
};

export const getWebsites: GetWebsites<void, { id: string; url: string; name: string; logoUrl: string | null; status: string; agentId: string | null; agentName: string | null; widgetColor: string; widgetPosition: string; widgetTitle: string; widgetAvatarUrl: string | null; allowedDomains: string[]; widgetWelcomeMessage: string; createdAt: Date }[]> = async (_args, context) => {
  assertUserAndOrg(context);
  const org = await getOrCreateUserOrg(context.user!.id);
  const websites = await prisma.website.findMany({
    where: { organizationId: org.id },
    include: { agent: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });
  return websites.map((w) => ({
    id: w.id,
    url: w.url,
    name: w.name,
    logoUrl: w.logoUrl,
    status: w.status,
    agentId: w.agentId,
    agentName: w.agent?.name ?? null,
    widgetColor: w.widgetColor,
    widgetPosition: w.widgetPosition,
    widgetTitle: w.widgetTitle,
    widgetAvatarUrl: w.widgetAvatarUrl,
    allowedDomains: w.allowedDomains,
    widgetWelcomeMessage: w.widgetWelcomeMessage,
    createdAt: w.createdAt,
  }));
};

const getWebsiteSchema = z.object({
  id: z.string(),
});

export const getWebsite: GetWebsite<typeof getWebsiteSchema._type, { id: string; url: string; name: string; logoUrl: string | null; status: string; agentId: string | null; agentName: string | null; widgetColor: string; widgetPosition: string; widgetTitle: string; widgetAvatarUrl: string | null; allowedDomains: string[]; widgetWelcomeMessage: string; createdAt: Date } | null> = async (rawArgs, context) => {
  assertUserAndOrg(context);
  const { id } = ensureArgsSchemaOrThrowHttpError(getWebsiteSchema, rawArgs);
  const org = await getOrCreateUserOrg(context.user!.id);
  const w = await prisma.website.findFirst({
    where: { id, organizationId: org.id },
    include: { agent: { select: { name: true } } },
  });
  if (!w) return null;
  return {
    id: w.id,
    url: w.url,
    name: w.name,
    logoUrl: w.logoUrl,
    status: w.status,
    agentId: w.agentId,
    agentName: w.agent?.name ?? null,
    widgetColor: w.widgetColor,
    widgetPosition: w.widgetPosition,
    widgetTitle: w.widgetTitle,
    widgetAvatarUrl: w.widgetAvatarUrl,
    allowedDomains: w.allowedDomains,
    widgetWelcomeMessage: w.widgetWelcomeMessage,
    createdAt: w.createdAt,
  };
};

const createWebsiteSchema = z.object({
  url: z.string().url(),
  name: z.string().min(1).max(100),
  logoUrl: z.string().url().or(z.literal("")).optional(),
  agentId: z.string().optional(),
  widgetColor: z.string().optional(),
  widgetPosition: z.enum(["right", "left"]).optional(),
  widgetTitle: z.string().max(50).optional(),
  widgetAvatarUrl: z.string().url().or(z.literal("")).optional(),
  allowedDomains: z.array(z.string()).optional(),
  widgetWelcomeMessage: z.string().optional(),
});

export const createWebsite: CreateWebsite<typeof createWebsiteSchema._type, { id: string; url: string; name: string; logoUrl: string | null; status: string; widgetColor: string; widgetPosition: string; widgetTitle: string; widgetAvatarUrl: string | null; allowedDomains: string[]; widgetWelcomeMessage: string }> = async (rawArgs, context) => {
  assertUserAndOrg(context);
  const args = ensureArgsSchemaOrThrowHttpError(createWebsiteSchema, rawArgs);
  const { url, name, logoUrl, agentId, widgetColor, widgetPosition, widgetTitle, widgetAvatarUrl, allowedDomains, widgetWelcomeMessage } = args;
  const org = await getOrCreateUserOrg(context.user!.id);

  const websiteLimit = await checkUsageLimits(org.id, "website");
  if (!websiteLimit.allowed) {
    throw new HttpError(403, `Website limit reached (${websiteLimit.limit}). Upgrade your plan to add more websites.`);
  }

  if (agentId) {
    await prisma.agent.findFirstOrThrow({
      where: { id: agentId, organizationId: org.id },
    });
  }
  const website = await prisma.website.create({
    data: { url, name, logoUrl: logoUrl || null, agentId, organizationId: org.id, widgetColor, widgetPosition, widgetTitle: widgetTitle || "AI Assistant", widgetAvatarUrl: widgetAvatarUrl || null, allowedDomains: allowedDomains ?? [], widgetWelcomeMessage },
  });
  return { id: website.id, url: website.url, name: website.name, logoUrl: website.logoUrl, status: website.status, widgetColor: website.widgetColor, widgetPosition: website.widgetPosition, widgetTitle: website.widgetTitle, widgetAvatarUrl: website.widgetAvatarUrl, allowedDomains: website.allowedDomains, widgetWelcomeMessage: website.widgetWelcomeMessage ?? "" };
};

const updateWebsiteSchema = z.object({
  id: z.string(),
  url: z.string().url().optional(),
  name: z.string().min(1).max(100).optional(),
  logoUrl: z.string().url().or(z.literal("")).optional(),
  status: z.enum(["active", "inactive"]).optional(),
  agentId: z.string().nullable().optional(),
  widgetColor: z.string().optional(),
  widgetPosition: z.enum(["right", "left"]).optional(),
  widgetTitle: z.string().max(50).optional(),
  widgetAvatarUrl: z.string().url().or(z.literal("")).optional(),
  allowedDomains: z.array(z.string()).optional(),
  widgetWelcomeMessage: z.string().optional(),
});

export const updateWebsite: UpdateWebsite<typeof updateWebsiteSchema._type, { id: string; url: string; name: string; logoUrl: string | null; status: string; widgetColor: string; widgetPosition: string; widgetTitle: string; widgetAvatarUrl: string | null; allowedDomains: string[]; widgetWelcomeMessage: string }> = async (rawArgs, context) => {
  assertUserAndOrg(context);
  const { id, ...data } = ensureArgsSchemaOrThrowHttpError(updateWebsiteSchema, rawArgs);
  const org = await getOrCreateUserOrg(context.user!.id);
  await prisma.website.findFirstOrThrow({
    where: { id, organizationId: org.id },
  });
  if (data.agentId) {
    await prisma.agent.findFirstOrThrow({
      where: { id: data.agentId, organizationId: org.id },
    });
  }
  if (data.logoUrl !== undefined) {
    data.logoUrl = data.logoUrl || null;
  }
  if (data.widgetAvatarUrl !== undefined) {
    data.widgetAvatarUrl = data.widgetAvatarUrl || null;
  }
  const website = await prisma.website.update({ where: { id }, data });
  return { id: website.id, url: website.url, name: website.name, logoUrl: website.logoUrl, status: website.status, widgetColor: website.widgetColor, widgetPosition: website.widgetPosition, widgetTitle: website.widgetTitle, widgetAvatarUrl: website.widgetAvatarUrl, allowedDomains: website.allowedDomains, widgetWelcomeMessage: website.widgetWelcomeMessage ?? "" };
};

const deleteWebsiteSchema = z.object({
  id: z.string(),
});

export const deleteWebsite: DeleteWebsite<typeof deleteWebsiteSchema._type, void> = async (rawArgs, context) => {
  assertUserAndOrg(context);
  const { id } = ensureArgsSchemaOrThrowHttpError(deleteWebsiteSchema, rawArgs);
  const org = await getOrCreateUserOrg(context.user!.id);
  const website = await prisma.website.findFirst({
    where: { id, organizationId: org.id },
  });
  if (!website) throw new HttpError(404, "Website not found");
  await prisma.conversation.updateMany({
    where: { websiteId: id },
    data: { websiteId: null },
  });
  await prisma.website.delete({ where: { id } });
};

export const getConversations: GetConversations<void, { id: string; visitorId: string | null; createdAt: Date; messageCount: number; leadEmail: string | null; leadName: string | null; agentName: string | null; websiteName: string | null }[]> = async (_args, context) => {
  assertUserAndOrg(context);
  const org = await getOrCreateUserOrg(context.user!.id);
  const conversations = await prisma.conversation.findMany({
    where: { organizationId: org.id },
    include: {
      _count: { select: { messages: true } },
      lead: { select: { email: true, name: true } },
      agent: { select: { name: true } },
      website: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return conversations.map((c) => ({
    id: c.id,
    visitorId: c.visitorId,
    createdAt: c.createdAt,
    messageCount: c._count.messages,
    leadEmail: c.lead?.email ?? null,
    leadName: c.lead?.name ?? null,
    agentName: c.agent?.name ?? null,
    websiteName: c.website?.name ?? null,
  }));
};

const getConversationMessagesSchema = z.object({
  id: z.string(),
});

export const getConversationMessages: GetConversationMessages<typeof getConversationMessagesSchema._type, { id: string; content: string; role: string; createdAt: Date }[]> = async (rawArgs, context) => {
  assertUserAndOrg(context);
  const { id } = ensureArgsSchemaOrThrowHttpError(getConversationMessagesSchema, rawArgs);
  const org = await getOrCreateUserOrg(context.user!.id);
  const conversation = await prisma.conversation.findFirst({
    where: { id, organizationId: org.id },
  });
  if (!conversation) throw new HttpError(404, "Conversation not found");
  const messages = await prisma.message.findMany({
    where: { conversationId: id },
    orderBy: { createdAt: "asc" },
  });
  return messages.map((m) => ({
    id: m.id,
    content: m.content,
    role: m.role,
    createdAt: m.createdAt,
  }));
};

export const getLeads: GetLeads<void, { id: string; email: string | null; name: string | null; phone: string | null; status: string; notes: string | null; createdAt: Date; sourceWebsiteId: string | null; sourceWebsiteName: string | null; conversations: { id: string; createdAt: Date; messageCount: number }[] }[]> = async (_args, context) => {
  assertUserAndOrg(context);
  const org = await getOrCreateUserOrg(context.user!.id);
  const leads = await prisma.lead.findMany({
    where: { organizationId: org.id },
    include: {
      sourceWebsite: { select: { name: true } },
      conversations: {
        include: { _count: { select: { messages: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  return leads.map((l) => ({
    id: l.id,
    email: l.email,
    name: l.name,
    phone: l.phone,
    status: l.status,
    notes: l.notes,
    createdAt: l.createdAt,
    sourceWebsiteId: l.sourceWebsiteId,
    sourceWebsiteName: l.sourceWebsite?.name ?? null,
    conversations: l.conversations.map((c) => ({
      id: c.id,
      createdAt: c.createdAt,
      messageCount: c._count.messages,
    })),
  }));
};

const updateLeadSchema = z.object({
  id: z.string(),
  name: z.string().max(100).optional(),
  email: z.string().email().or(z.literal("")).optional(),
  phone: z.string().max(30).or(z.literal("")).optional(),
  status: z.enum(["new", "contacted", "closed"]).optional(),
  notes: z.string().max(1000).optional(),
});

export const updateLead: UpdateLead<typeof updateLeadSchema._type, { id: string; email: string | null; name: string | null; phone: string | null; status: string; notes: string | null } | null> = async (rawArgs, context) => {
  assertUserAndOrg(context);
  const args = ensureArgsSchemaOrThrowHttpError(updateLeadSchema, rawArgs);
  const { id, ...data } = args;
  const org = await getOrCreateUserOrg(context.user!.id);
  const lead = await prisma.lead.findFirst({
    where: { id, organizationId: org.id },
  });
  if (!lead) return null;
  const updateData: Record<string, unknown> = {};
  if (data.name !== undefined) updateData.name = data.name || null;
  if (data.email !== undefined) updateData.email = data.email || null;
  if (data.phone !== undefined) updateData.phone = data.phone || null;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.notes !== undefined) updateData.notes = data.notes || null;
  const updated = await prisma.lead.update({ where: { id }, data: updateData });
  return { id: updated.id, email: updated.email, name: updated.name, phone: updated.phone, status: updated.status, notes: updated.notes };
};

const deleteLeadSchema = z.object({
  id: z.string(),
});

export const deleteLead: DeleteLead<typeof deleteLeadSchema._type, void> = async (rawArgs, context) => {
  assertUserAndOrg(context);
  const { id } = ensureArgsSchemaOrThrowHttpError(deleteLeadSchema, rawArgs);
  const org = await getOrCreateUserOrg(context.user!.id);
  const lead = await prisma.lead.findFirst({
    where: { id, organizationId: org.id },
  });
  if (!lead) throw new HttpError(404, "Lead not found");
  await prisma.conversation.updateMany({
    where: { leadId: id },
    data: { leadId: null },
  });
  await prisma.lead.delete({ where: { id } });
};

export const getDashboardStats: GetDashboardStats<void, { totalAgents: number; activeAgents: number; totalWebsites: number; totalConversations: number; totalLeads: number; newLeads: number; recentConversations: { id: string; visitorId: string | null; createdAt: Date; leadName: string | null }[] }> = async (_args, context) => {
  assertUserAndOrg(context);
  const org = await getOrCreateUserOrg(context.user!.id);
  const [totalAgents, activeAgents, totalWebsites, totalConversations, totalLeads, newLeads, recentConversations] =
    await Promise.all([
      prisma.agent.count({ where: { organizationId: org.id } }),
      prisma.agent.count({ where: { organizationId: org.id, status: "active" } }),
      prisma.website.count({ where: { organizationId: org.id } }),
      prisma.conversation.count({ where: { organizationId: org.id } }),
      prisma.lead.count({ where: { organizationId: org.id } }),
      prisma.lead.count({ where: { organizationId: org.id, status: "new" } }),
      prisma.conversation.findMany({
        where: { organizationId: org.id },
        include: { lead: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ]);
  return {
    totalAgents,
    activeAgents,
    totalWebsites,
    totalConversations,
    totalLeads,
    newLeads,
    recentConversations: recentConversations.map((c) => ({
      id: c.id,
      visitorId: c.visitorId,
      createdAt: c.createdAt,
      leadName: c.lead?.name ?? null,
    })),
  };
};

export const getAnalyticsData: GetAnalyticsData<void, {
  summary: {
    totalConversations: number;
    monthConversations: number;
    totalVisitors: number;
    monthVisitors: number;
    totalLeads: number;
    newLeads: number;
    totalTokens: number;
    monthTokens: number;
    totalCost: number;
    monthCost: number;
  };
  conversationsByDay: { date: string; count: number }[];
  aiUsageByDay: { date: string; tokens: number; cost: number }[];
  usageByModel: { model: string; tokens: number; cost: number }[];
}> = async (_args, context) => {
  assertUserAndOrg(context);
  const org = await getOrCreateUserOrg(context.user!.id);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  thirtyDaysAgo.setHours(0, 0, 0, 0);

  const [
    totalConversations,
    monthConversations,
    totalLeads,
    newLeads,
    conversations,
    monthConversationsList,
    aiUsage,
    aiUsageMonth,
  ] = await Promise.all([
    prisma.conversation.count({ where: { organizationId: org.id } }),
    prisma.conversation.count({ where: { organizationId: org.id, createdAt: { gte: monthStart } } }),
    prisma.lead.count({ where: { organizationId: org.id } }),
    prisma.lead.count({ where: { organizationId: org.id, status: "new" } }),
    prisma.conversation.findMany({
      where: { organizationId: org.id, createdAt: { gte: thirtyDaysAgo } },
      select: { createdAt: true },
    }),
    prisma.conversation.findMany({
      where: { organizationId: org.id, createdAt: { gte: monthStart } },
      select: { visitorId: true },
    }),
    prisma.aiUsage.findMany({
      where: { organizationId: org.id, date: { gte: thirtyDaysAgo } },
      orderBy: { date: "asc" },
    }),
    prisma.aiUsage.findMany({
      where: { organizationId: org.id, date: { gte: monthStart } },
    }),
  ]);

  const visitorIds = new Set(conversations.map((c) => c.visitorId).filter(Boolean));
  const monthVisitorIds = new Set(monthConversationsList.map((c) => c.visitorId).filter(Boolean));

  const totalVisitors = visitorIds.size;
  const monthVisitors = monthVisitorIds.size;

  const totalTokens = aiUsage.reduce((acc, u) => acc + u.promptTokens + u.completionTokens, 0);
  const monthTokens = aiUsageMonth.reduce((acc, u) => acc + u.promptTokens + u.completionTokens, 0);
  const totalCost = aiUsage.reduce((acc, u) => acc + u.cost, 0);
  const monthCost = aiUsageMonth.reduce((acc, u) => acc + u.cost, 0);

  const conversationsByDayMap = new Map<string, number>();
  for (let i = 0; i < 30; i++) {
    const d = new Date(thirtyDaysAgo);
    d.setDate(d.getDate() + i);
    conversationsByDayMap.set(d.toISOString().split("T")[0], 0);
  }
  for (const c of conversations) {
    const key = c.createdAt.toISOString().split("T")[0];
    conversationsByDayMap.set(key, (conversationsByDayMap.get(key) ?? 0) + 1);
  }
  const conversationsByDay = Array.from(conversationsByDayMap.entries()).map(([date, count]) => ({ date, count }));

  const aiUsageByDayMap = new Map<string, { tokens: number; cost: number }>();
  for (let i = 0; i < 30; i++) {
    const d = new Date(thirtyDaysAgo);
    d.setDate(d.getDate() + i);
    aiUsageByDayMap.set(d.toISOString().split("T")[0], { tokens: 0, cost: 0 });
  }
  for (const u of aiUsage) {
    const key = u.date.toISOString().split("T")[0];
    const entry = aiUsageByDayMap.get(key) ?? { tokens: 0, cost: 0 };
    entry.tokens += u.promptTokens + u.completionTokens;
    entry.cost += u.cost;
    aiUsageByDayMap.set(key, entry);
  }
  const aiUsageByDay = Array.from(aiUsageByDayMap.entries()).map(([date, v]) => ({ date, ...v }));

  const usageByModelMap = new Map<string, { tokens: number; cost: number }>();
  for (const u of aiUsageMonth) {
    const entry = usageByModelMap.get(u.model) ?? { tokens: 0, cost: 0 };
    entry.tokens += u.promptTokens + u.completionTokens;
    entry.cost += u.cost;
    usageByModelMap.set(u.model, entry);
  }
  const usageByModel = Array.from(usageByModelMap.entries())
    .map(([model, v]) => ({ model, ...v }))
    .sort((a, b) => b.cost - a.cost);

  return {
    summary: {
      totalConversations,
      monthConversations,
      totalVisitors,
      monthVisitors,
      totalLeads,
      newLeads,
      totalTokens,
      monthTokens,
      totalCost,
      monthCost,
    },
    conversationsByDay,
    aiUsageByDay,
    usageByModel,
  };
};

// --- Knowledge Base Operations ---

export const getKnowledgeBases: GetKnowledgeBases<void, { id: string; name: string; description: string | null; documentCount: number; createdAt: Date }[]> = async (_args, context) => {
  assertUserAndOrg(context);
  const org = await getOrCreateUserOrg(context.user!.id);
  const kbs = await prisma.knowledgeBase.findMany({
    where: { organizationId: org.id },
    include: { _count: { select: { documents: true } } },
    orderBy: { createdAt: "desc" },
  });
  return kbs.map((kb) => ({
    id: kb.id,
    name: kb.name,
    description: kb.description,
    documentCount: kb._count.documents,
    createdAt: kb.createdAt,
  }));
};

const getKnowledgeBaseSchema = z.object({ id: z.string() });

export const getKnowledgeBase: GetKnowledgeBase<typeof getKnowledgeBaseSchema._type, {
  id: string; name: string; description: string | null; createdAt: Date;
  documents: { id: string; title: string; sourceType: string; sourceUrl: string | null; fileType: string | null; status: string; errorMessage: string | null; chunkCount: number; createdAt: Date }[];
  agents: { id: string; agent: { id: string; name: string } }[];
} | null> = async (rawArgs, context) => {
  assertUserAndOrg(context);
  const { id } = ensureArgsSchemaOrThrowHttpError(getKnowledgeBaseSchema, rawArgs);
  const org = await getOrCreateUserOrg(context.user!.id);
  const kb = await prisma.knowledgeBase.findFirst({
    where: { id, organizationId: org.id },
    include: {
      documents: { orderBy: { createdAt: "desc" } },
      agents: { include: { agent: { select: { id: true, name: true } } } },
    },
  });
  if (!kb) return null;
  return {
    id: kb.id, name: kb.name, description: kb.description, createdAt: kb.createdAt,
    documents: kb.documents.map((d) => ({
      id: d.id, title: d.title, sourceType: d.sourceType, sourceUrl: d.sourceUrl,
      fileType: d.fileType, status: d.status, errorMessage: d.errorMessage,
      chunkCount: d.chunkCount, createdAt: d.createdAt,
    })),
    agents: kb.agents.map((a) => ({ id: a.id, agent: { id: a.agent.id, name: a.agent.name } })),
  };
};

const getKnowledgeDocumentsSchema = z.object({ knowledgeBaseId: z.string() });

export const getKnowledgeDocuments: GetKnowledgeDocuments<typeof getKnowledgeDocumentsSchema._type, { id: string; title: string; sourceType: string; status: string; chunkCount: number; createdAt: Date }[]> = async (rawArgs, context) => {
  assertUserAndOrg(context);
  const { knowledgeBaseId } = ensureArgsSchemaOrThrowHttpError(getKnowledgeDocumentsSchema, rawArgs);
  const org = await getOrCreateUserOrg(context.user!.id);
  const kb = await prisma.knowledgeBase.findFirst({
    where: { id: knowledgeBaseId, organizationId: org.id },
  });
  if (!kb) throw new HttpError(404, "Knowledge base not found");
  const docs = await prisma.knowledgeDocument.findMany({
    where: { knowledgeBaseId },
    orderBy: { createdAt: "desc" },
  });
  return docs.map((d) => ({
    id: d.id, title: d.title, sourceType: d.sourceType,
    status: d.status, chunkCount: d.chunkCount, createdAt: d.createdAt,
  }));
};

export const getAgentKnowledgeBases: GetAgentKnowledgeBases<void, { id: string; name: string; description: string | null; documentCount: number; linked: boolean }[]> = async (_args, context) => {
  assertUserAndOrg(context);
  const org = await getOrCreateUserOrg(context.user!.id);
  const kbs = await prisma.knowledgeBase.findMany({
    where: { organizationId: org.id },
    include: { _count: { select: { documents: true } } },
    orderBy: { createdAt: "desc" },
  });
  return kbs.map((kb) => ({
    id: kb.id, name: kb.name, description: kb.description,
    documentCount: kb._count.documents, linked: false,
  }));
};

const createKnowledgeBaseSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
});

export const createKnowledgeBase: CreateKnowledgeBase<typeof createKnowledgeBaseSchema._type, { id: string; name: string; description: string | null }> = async (rawArgs, context) => {
  assertUserAndOrg(context);
  const { name, description } = ensureArgsSchemaOrThrowHttpError(createKnowledgeBaseSchema, rawArgs);
  const org = await getOrCreateUserOrg(context.user!.id);
  const kb = await prisma.knowledgeBase.create({
    data: { name, description, organizationId: org.id },
  });
  return { id: kb.id, name: kb.name, description: kb.description };
};

const deleteKnowledgeBaseSchema = z.object({ id: z.string() });

export const deleteKnowledgeBase: DeleteKnowledgeBase<typeof deleteKnowledgeBaseSchema._type, void> = async (rawArgs, context) => {
  assertUserAndOrg(context);
  const { id } = ensureArgsSchemaOrThrowHttpError(deleteKnowledgeBaseSchema, rawArgs);
  const org = await getOrCreateUserOrg(context.user!.id);
  const kb = await prisma.knowledgeBase.findFirst({ where: { id, organizationId: org.id } });
  if (!kb) throw new HttpError(404, "Knowledge base not found");
  const docs = await prisma.knowledgeDocument.findMany({
    where: { knowledgeBaseId: id },
    select: { id: true },
  });
  await prisma.documentChunk.deleteMany({
    where: { documentId: { in: docs.map((d) => d.id) } },
  });
  await prisma.knowledgeDocument.deleteMany({ where: { knowledgeBaseId: id } });
  await prisma.agentKnowledgeBase.deleteMany({ where: { knowledgeBaseId: id } });
  await prisma.knowledgeBase.delete({ where: { id } });
};

const uploadKnowledgeDocumentSchema = z.object({
  knowledgeBaseId: z.string(),
  fileName: z.string().min(1),
  fileData: z.string().min(1), // base64 encoded file content
});

export const uploadKnowledgeDocument: UploadKnowledgeDocument<typeof uploadKnowledgeDocumentSchema._type, { id: string; title: string; status: string; chunkCount: number }> = async (rawArgs, context) => {
  assertUserAndOrg(context);
  const { knowledgeBaseId, fileName, fileData } = ensureArgsSchemaOrThrowHttpError(uploadKnowledgeDocumentSchema, rawArgs);
  const org = await getOrCreateUserOrg(context.user!.id);
  const kb = await prisma.knowledgeBase.findFirst({ where: { id: knowledgeBaseId, organizationId: org.id } });
  if (!kb) throw new HttpError(404, "Knowledge base not found");

  const fileType = getFileType(fileName);
  if (!fileType) throw new HttpError(400, "Unsupported file type. Allowed: pdf, docx, txt");

  const doc = await prisma.knowledgeDocument.create({
    data: {
      title: fileName,
      sourceType: "upload",
      sourceUrl: fileName,
      fileType,
      status: "processing",
      knowledgeBaseId,
    },
  });

  try {
    const buffer = Buffer.from(fileData, "base64");
    const text = await extractTextFromBuffer(buffer, fileType);
    const chunks = chunkText(text);
    await prisma.documentChunk.createMany({
      data: chunks.map((content, i) => ({
        documentId: doc.id,
        content,
        index: i,
      })),
    });
    const updated = await prisma.knowledgeDocument.update({
      where: { id: doc.id },
      data: { status: "ready", chunkCount: chunks.length },
    });
    return { id: updated.id, title: updated.title, status: updated.status, chunkCount: updated.chunkCount };
  } catch (err) {
    await prisma.knowledgeDocument.update({
      where: { id: doc.id },
      data: { status: "error", errorMessage: (err as Error).message },
    });
    throw new HttpError(500, `Processing failed: ${(err as Error).message}`);
  }
};

const crawlUrlSchema = z.object({
  knowledgeBaseId: z.string(),
  url: z.string().min(1),
  isSitemap: z.boolean().optional(),
});

export const crawlUrl: CrawlUrl<typeof crawlUrlSchema._type, { id: string; title: string; status: string; chunkCount: number }> = async (rawArgs, context) => {
  assertUserAndOrg(context);
  const { knowledgeBaseId, url, isSitemap = false } = ensureArgsSchemaOrThrowHttpError(crawlUrlSchema, rawArgs);
  const org = await getOrCreateUserOrg(context.user!.id);
  const kb = await prisma.knowledgeBase.findFirst({ where: { id: knowledgeBaseId, organizationId: org.id } });
  if (!kb) throw new HttpError(404, "Knowledge base not found");

  const urlsToCrawl = isSitemap ? await parseSitemapUrls(url) : [url];
  const title = isSitemap ? `Sitemap: ${url}` : url;
  const doc = await prisma.knowledgeDocument.create({
    data: { title, sourceType: "crawl", sourceUrl: url, fileType: "html", status: "processing", knowledgeBaseId },
  });

  try {
    let allText = "";
    for (const pageUrl of urlsToCrawl) {
      const response = await fetch(pageUrl);
      if (!response.ok) continue;
      const html = await response.text();
      const text = await extractHtmlText(html);
      allText += `\n\n--- Page: ${pageUrl} ---\n\n${text}`;
    }
    if (!allText.trim()) throw new Error("No content could be extracted from the URL(s)");
    const chunks = chunkText(allText);
    await prisma.documentChunk.createMany({
      data: chunks.map((content, i) => ({
        documentId: doc.id,
        content,
        index: i,
      })),
    });
    const updated = await prisma.knowledgeDocument.update({
      where: { id: doc.id },
      data: { status: "ready", chunkCount: chunks.length },
    });
    return { id: updated.id, title: updated.title, status: updated.status, chunkCount: updated.chunkCount };
  } catch (err) {
    await prisma.knowledgeDocument.update({
      where: { id: doc.id },
      data: { status: "error", errorMessage: (err as Error).message },
    });
    throw new HttpError(500, `Crawl failed: ${(err as Error).message}`);
  }
};

async function parseSitemapUrls(sitemapUrl: string): Promise<string[]> {
  const response = await fetch(sitemapUrl);
  if (!response.ok) throw new Error(`Failed to fetch sitemap: ${response.statusText}`);
  const xml = await response.text();
  const urls: string[] = [];
  const locRegex = /<loc>([^<]+)<\/loc>/gi;
  let match;
  while ((match = locRegex.exec(xml)) !== null) {
    urls.push(match[1].trim());
  }
  if (urls.length === 0) throw new Error("No URLs found in sitemap");
  return urls;
}

const deleteKnowledgeDocumentSchema = z.object({ id: z.string() });

export const deleteKnowledgeDocument: DeleteKnowledgeDocument<typeof deleteKnowledgeDocumentSchema._type, void> = async (rawArgs, context) => {
  assertUserAndOrg(context);
  const { id } = ensureArgsSchemaOrThrowHttpError(deleteKnowledgeDocumentSchema, rawArgs);
  const doc = await prisma.knowledgeDocument.findUnique({ where: { id }, include: { knowledgeBase: true } });
  if (!doc) throw new HttpError(404, "Document not found");
  const org = await getOrCreateUserOrg(context.user!.id);
  if (doc.knowledgeBase.organizationId !== org.id) throw new HttpError(403, "Forbidden");
  await prisma.documentChunk.deleteMany({ where: { documentId: id } });
  await prisma.knowledgeDocument.delete({ where: { id } });
};

// --- Custom Text Entry ---

const createCustomTextEntrySchema = z.object({
  knowledgeBaseId: z.string(),
  title: z.string().min(1).max(200),
  content: z.string().min(10).max(100000),
});

export const createCustomTextEntry: any = async (rawArgs: unknown, context: any) => {
  assertUserAndOrg(context);
  const { knowledgeBaseId, title, content } = ensureArgsSchemaOrThrowHttpError(createCustomTextEntrySchema, rawArgs);
  const org = await getOrCreateUserOrg(context.user!.id);
  const kb = await prisma.knowledgeBase.findFirst({ where: { id: knowledgeBaseId, organizationId: org.id } });
  if (!kb) throw new HttpError(404, "Knowledge base not found");

  const doc = await prisma.knowledgeDocument.create({
    data: {
      title,
      sourceType: "text",
      fileType: "txt",
      status: "processing",
      knowledgeBaseId,
    },
  });

  try {
    const { chunkText } = await import("./knowledge/processing");
    const chunks = chunkText(content);
    await prisma.documentChunk.createMany({
      data: chunks.map((chunkContent, i) => ({
        documentId: doc.id,
        content: chunkContent,
        index: i,
      })),
    });
    const updated = await prisma.knowledgeDocument.update({
      where: { id: doc.id },
      data: { status: "ready", chunkCount: chunks.length },
    });
    return { id: updated.id, title: updated.title, status: updated.status, chunkCount: updated.chunkCount };
  } catch (err) {
    await prisma.knowledgeDocument.update({
      where: { id: doc.id },
      data: { status: "error", errorMessage: (err as Error).message },
    });
    throw new HttpError(500, `Processing failed: ${(err as Error).message}`);
  }
};

const linkAgentToKnowledgeBaseSchema = z.object({
  agentId: z.string(),
  knowledgeBaseId: z.string(),
});

export const linkAgentToKnowledgeBase: LinkAgentToKnowledgeBase<typeof linkAgentToKnowledgeBaseSchema._type, void> = async (rawArgs, context) => {
  assertUserAndOrg(context);
  const { agentId, knowledgeBaseId } = ensureArgsSchemaOrThrowHttpError(linkAgentToKnowledgeBaseSchema, rawArgs);
  const org = await getOrCreateUserOrg(context.user!.id);
  const agent = await prisma.agent.findFirst({ where: { id: agentId, organizationId: org.id } });
  if (!agent) throw new HttpError(404, "Agent not found");
  const kb = await prisma.knowledgeBase.findFirst({ where: { id: knowledgeBaseId, organizationId: org.id } });
  if (!kb) throw new HttpError(404, "Knowledge base not found");
  const existing = await prisma.agentKnowledgeBase.findUnique({
    where: { agentId_knowledgeBaseId: { agentId, knowledgeBaseId } },
  });
  if (existing) throw new HttpError(409, "Already linked");
  await prisma.agentKnowledgeBase.create({ data: { agentId, knowledgeBaseId } });
};

const unlinkAgentFromKnowledgeBaseSchema = z.object({
  agentId: z.string(),
  knowledgeBaseId: z.string(),
});

export const unlinkAgentFromKnowledgeBase: UnlinkAgentFromKnowledgeBase<typeof unlinkAgentFromKnowledgeBaseSchema._type, void> = async (rawArgs, context) => {
  assertUserAndOrg(context);
  const { agentId, knowledgeBaseId } = ensureArgsSchemaOrThrowHttpError(unlinkAgentFromKnowledgeBaseSchema, rawArgs);
  const org = await getOrCreateUserOrg(context.user!.id);
  const agent = await prisma.agent.findFirst({ where: { id: agentId, organizationId: org.id } });
  if (!agent) throw new HttpError(404, "Agent not found");
  await prisma.agentKnowledgeBase.delete({
    where: { agentId_knowledgeBaseId: { agentId, knowledgeBaseId } },
  });
};

const updateAiSettingsSchema = z.object({
  aiProvider: z.enum(["openai", "gemini"]).optional(),
  aiModel: z.string().optional(),
  openaiApiKey: z.string().optional(),
  geminiApiKey: z.string().optional(),
  monthlyTokenLimit: z.number().int().positive().optional().nullable(),
});

export const updateAiSettings: any = async (rawArgs: unknown, context: any) => {
  assertUserAndOrg(context);
  const data = ensureArgsSchemaOrThrowHttpError(updateAiSettingsSchema, rawArgs);
  const org = await getOrCreateUserOrg(context.user!.id);

  const updateData: Record<string, unknown> = {};
  if (data.aiProvider !== undefined) updateData.aiProvider = data.aiProvider;
  if (data.aiModel !== undefined) updateData.aiModel = data.aiModel;
  if (data.openaiApiKey !== undefined) updateData.openaiApiKey = data.openaiApiKey;
  if (data.geminiApiKey !== undefined) updateData.geminiApiKey = data.geminiApiKey;
  if (data.monthlyTokenLimit !== undefined) updateData.monthlyTokenLimit = data.monthlyTokenLimit;

  await prisma.organization.update({ where: { id: org.id }, data: updateData });

  return { success: true };
};

export const getAiSettings: any = async (_args: unknown, context: any) => {
  assertUserAndOrg(context);
  const org = await getOrCreateUserOrg(context.user!.id);

  return {
    aiProvider: org.aiProvider,
    aiModel: org.aiModel,
    openaiApiKey: org.openaiApiKey ? "••••••••" + org.openaiApiKey.slice(-4) : null,
    geminiApiKey: org.geminiApiKey ? "••••••••" + org.geminiApiKey.slice(-4) : null,
    monthlyTokenLimit: org.monthlyTokenLimit,
  };
};

const getAiUsageSchema = z.object({
  days: z.number().int().positive().optional().default(30),
});

export const getAiUsage: any = async (rawArgs: unknown, context: any) => {
  assertUserAndOrg(context);
  const { days } = ensureArgsSchemaOrThrowHttpError(getAiUsageSchema, rawArgs ?? {});
  const org = await getOrCreateUserOrg(context.user!.id);

  const since = new Date();
  since.setDate(since.getDate() - (days ?? 30));
  since.setHours(0, 0, 0, 0);

  const usage = await prisma.aiUsage.findMany({
    where: { organizationId: org.id, date: { gte: since } },
    orderBy: { date: "asc" },
  });

  const totals = usage.reduce(
    (acc, curr) => ({
      promptTokens: acc.promptTokens + curr.promptTokens,
      completionTokens: acc.completionTokens + curr.completionTokens,
      cost: acc.cost + curr.cost,
    }),
    { promptTokens: 0, completionTokens: 0, cost: 0 },
  );

  return {
    daily: usage,
    totals,
  };
};

// --- Organization Slug Verification ---

const verifySlugSchema = z.object({
  slug: z.string().min(3).max(50).regex(/^[a-z0-9-]+$/),
});

export const verifyOrganizationSlug: any = async (rawArgs: unknown, context: any) => {
  assertUserAndOrg(context);
  const { slug } = ensureArgsSchemaOrThrowHttpError(verifySlugSchema, rawArgs);
  const existing = await prisma.organization.findUnique({ where: { slug } });
  const org = await getOrCreateUserOrg(context.user!.id);
  return {
    available: !existing || existing.id === org.id,
    slug,
  };
};

// --- Invitation System ---

export const getInvitations: any = async (_args: unknown, context: any) => {
  assertUserAndOrg(context);
  const org = await getOrCreateUserOrg(context.user!.id);
  const invitations = await prisma.invitation.findMany({
    where: { organizationId: org.id, expiresAt: { gt: new Date() } },
    include: { invitedBy: { select: { email: true, username: true } } },
    orderBy: { createdAt: "desc" },
  });
  return invitations.map((inv) => ({
    id: inv.id,
    email: inv.email,
    role: inv.role,
    createdAt: inv.createdAt,
    expiresAt: inv.expiresAt,
    invitedBy: inv.invitedBy?.email ?? inv.invitedBy?.username ?? "Unknown",
  }));
};

const sendInvitationSchema = z.object({
  email: z.string().email(),
  role: z.enum(["member", "admin"]).default("member"),
});

export const sendInvitation: any = async (rawArgs: unknown, context: any) => {
  assertUserAndOrg(context);
  const { email, role } = ensureArgsSchemaOrThrowHttpError(sendInvitationSchema, rawArgs);
  const org = await getOrCreateUserOrg(context.user!.id);

  // Check owner/admin permission
  const membership = await prisma.organizationMember.findFirst({
    where: { organizationId: org.id, userId: context.user!.id },
  });
  if (!membership || !["owner", "admin"].includes(membership.role)) {
    throw new HttpError(403, "Only owners and admins can send invitations");
  }

  // Check member limit
  if (org.memberLimit) {
    const memberCount = await prisma.organizationMember.count({
      where: { organizationId: org.id },
    });
    if (memberCount >= org.memberLimit) {
      throw new HttpError(400, `Organization has reached its member limit of ${org.memberLimit}`);
    }
  }

  // Check if user is already a member
  const invitedUser = await prisma.user.findUnique({ where: { email } });
  if (invitedUser) {
    const existingMember = await prisma.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId: org.id, userId: invitedUser.id } },
    });
    if (existingMember) {
      throw new HttpError(409, "User is already a member of this organization");
    }
  }

  // Check for existing pending invitation
  const existingInvitation = await prisma.invitation.findUnique({
    where: { organizationId_email: { organizationId: org.id, email } },
  });
  if (existingInvitation && existingInvitation.expiresAt > new Date()) {
    throw new HttpError(409, "An invitation has already been sent to this email");
  }

  // Delete expired invitation if exists
  if (existingInvitation) {
    await prisma.invitation.delete({ where: { id: existingInvitation.id } });
  }

  // Create invitation with 7-day expiry
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const invitation = await prisma.invitation.create({
    data: {
      email,
      token,
      role,
      expiresAt,
      organizationId: org.id,
      invitedById: context.user!.id,
    },
  });

  // Log audit event
  await logAuditEvent(org.id, context.user!.id, "member.invited", { email, role }, context);

  return {
    id: invitation.id,
    email: invitation.email,
    role: invitation.role,
    expiresAt: invitation.expiresAt,
  };
};

const cancelInvitationSchema = z.object({
  invitationId: z.string(),
});

export const cancelInvitation: any = async (rawArgs: unknown, context: any) => {
  assertUserAndOrg(context);
  const { invitationId } = ensureArgsSchemaOrThrowHttpError(cancelInvitationSchema, rawArgs);
  const org = await getOrCreateUserOrg(context.user!.id);

  const membership = await prisma.organizationMember.findFirst({
    where: { organizationId: org.id, userId: context.user!.id },
  });
  if (!membership || !["owner", "admin"].includes(membership.role)) {
    throw new HttpError(403, "Only owners and admins can cancel invitations");
  }

  const invitation = await prisma.invitation.findFirst({
    where: { id: invitationId, organizationId: org.id },
  });
  if (!invitation) {
    throw new HttpError(404, "Invitation not found");
  }

  await prisma.invitation.delete({ where: { id: invitationId } });

  // Log audit event
  await logAuditEvent(org.id, context.user!.id, "member.invitation_cancelled", { email: invitation.email }, context);

  return { success: true };
};

const acceptInvitationSchema = z.object({
  token: z.string(),
});

export const acceptInvitation: any = async (rawArgs: unknown, context: any) => {
  assertUserAndOrg(context);
  const { token } = ensureArgsSchemaOrThrowHttpError(acceptInvitationSchema, rawArgs);

  const invitation = await prisma.invitation.findUnique({
    where: { token },
    include: { organization: true },
  });

  if (!invitation) {
    throw new HttpError(404, "Invitation not found");
  }

  if (invitation.expiresAt < new Date()) {
    throw new HttpError(400, "Invitation has expired");
  }

  // Check if user email matches invitation
  const user = await prisma.user.findUnique({ where: { id: context.user!.id } });
  if (!user || user.email !== invitation.email) {
    throw new HttpError(403, "This invitation is not for your email address");
  }

  // Check if already a member
  const existingMember = await prisma.organizationMember.findUnique({
    where: { organizationId_userId: { organizationId: invitation.organizationId, userId: context.user!.id } },
  });
  if (existingMember) {
    // Delete the invitation since user is already a member
    await prisma.invitation.delete({ where: { id: invitation.id } });
    throw new HttpError(409, "You are already a member of this organization");
  }

  // Add user as member
  await prisma.organizationMember.create({
    data: {
      organizationId: invitation.organizationId,
      userId: context.user!.id,
      role: invitation.role,
      invitedAt: new Date(),
      invitedById: invitation.invitedById,
    },
  });

  // Delete the invitation
  await prisma.invitation.delete({ where: { id: invitation.id } });

  // Log audit event
  await logAuditEvent(invitation.organizationId, context.user!.id, "member.joined", { email: user.email }, context);

  return {
    success: true,
    organization: {
      id: invitation.organization.id,
      name: invitation.organization.name,
    },
  };
};

// --- Audit Logs ---

const getAuditLogsSchema = z.object({
  limit: z.number().int().min(1).max(100).optional().default(50),
  offset: z.number().int().min(0).optional().default(0),
  action: z.string().optional(),
});

export const getAuditLogs: any = async (rawArgs: unknown, context: any) => {
  assertUserAndOrg(context);
  const { limit = 50, offset = 0, action } = ensureArgsSchemaOrThrowHttpError(getAuditLogsSchema, rawArgs ?? {});
  const org = await getOrCreateUserOrg(context.user!.id);

  const where: any = { organizationId: org.id };
  if (action) where.action = action;

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: { user: { select: { email: true, username: true } } },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    logs: logs.map((log) => ({
      id: log.id,
      action: log.action,
      metadata: log.metadata,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      createdAt: log.createdAt,
      user: log.user?.email ?? log.user?.username ?? "System",
    })),
    total,
    hasMore: offset + limit < total,
  };
};

async function logAuditEvent(
  organizationId: string,
  userId: string | null,
  action: string,
  metadata?: Record<string, unknown>,
  context?: { req?: { ip?: string; headers?: { [key: string]: string } } }
) {
  try {
    await prisma.auditLog.create({
      data: {
        action,
        metadata: metadata ?? {},
        ipAddress: context?.req?.ip ?? null,
        userAgent: context?.req?.headers?.["user-agent"] ?? null,
        organizationId,
        userId,
      },
    });
  } catch (err) {
    // Don't throw on audit log failures - just log to console
    console.error("Failed to create audit log:", err);
  }
}

// --- Usage Limits Check ---

export async function checkUsageLimits(
  organizationId: string,
  type: "website" | "conversation" | "token" | "member",
): Promise<{ allowed: boolean; current: number; limit: number } | { allowed: true }> {
  const org = await prisma.organization.findUnique({ where: { id: organizationId } });
  if (!org) throw new HttpError(404, "Organization not found");

  switch (type) {
    case "website": {
      const limit = org.memberLimit ?? 10;
      const websiteCount = await prisma.website.count({ where: { organizationId } });
      return { allowed: websiteCount < limit, current: websiteCount, limit };
    }
    case "conversation": {
      const limit = org.monthlyConversationLimit ?? 1000;
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const count = await prisma.conversation.count({
        where: { organizationId, createdAt: { gte: monthStart } },
      });
      return { allowed: count < limit, current: count, limit };
    }
    case "token": {
      const limit = org.monthlyTokenLimit ?? 100000;
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const usage = await prisma.aiUsage.aggregate({
        where: { organizationId, date: { gte: monthStart } },
        _sum: { promptTokens: true, completionTokens: true },
      });
      const totalTokens = (usage._sum.promptTokens ?? 0) + (usage._sum.completionTokens ?? 0);
      return { allowed: totalTokens < limit, current: totalTokens, limit };
    }
    case "member": {
      const limit = org.memberLimit ?? 10;
      const count = await prisma.organizationMember.count({ where: { organizationId } });
      return { allowed: count < limit, current: count, limit };
    }
    default:
      return { allowed: true };
  }
}
