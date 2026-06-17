import { emailSender } from "wasp/server/email";
import { prisma } from "wasp/server";

function appUrl(): string {
  return process.env.APP_URL || process.env.WASP_WEB_CLIENT_URL || "http://localhost:3001";
}

// --- New Lead Notification ---
export async function sendNewLeadEmail(
  organizationId: string,
  lead: { id: string; email: string | null; name: string | null },
  websiteName: string,
  messagePreview: string,
): Promise<void> {
  try {
    const members = await prisma.organizationMember.findMany({
      where: { organizationId },
      include: { user: { select: { email: true } } },
    });
    const emails = members
      .map((m) => m.user.email)
      .filter((e): e is string => !!e);

    if (emails.length === 0) return;

    const leadName = lead.name || "Anonymous";
    const leadEmail = lead.email || "No email provided";
    const preview = messagePreview.length > 200
      ? messagePreview.slice(0, 200) + "..."
      : messagePreview;

    await emailSender.send({
      to: emails.join(","),
      subject: `New lead received from ${websiteName}`,
      text: `New lead received from ${websiteName}\n\nName: ${leadName}\nEmail: ${leadEmail}\nMessage: ${preview}\n\nView lead: ${appUrl()}/app/leads`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">New lead received from ${escapeHtml(websiteName)}</h2>
          <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
            <tr><td style="padding: 8px; font-weight: bold; color: #555;">Name</td><td style="padding: 8px;">${escapeHtml(leadName)}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold; color: #555;">Email</td><td style="padding: 8px;"><a href="mailto:${escapeHtml(leadEmail)}">${escapeHtml(leadEmail)}</a></td></tr>
            <tr><td style="padding: 8px; font-weight: bold; color: #555;">Message</td><td style="padding: 8px;">${escapeHtml(preview)}</td></tr>
          </table>
          <a href="${appUrl()}/app/leads" style="display: inline-block; padding: 10px 20px; background: #000; color: #fff; text-decoration: none; border-radius: 6px;">View Lead</a>
        </div>
      `,
    });
  } catch (err) {
    console.error("Failed to send new lead email:", err);
  }
}

// --- Member Invitation Email ---
export async function sendInvitationEmail(
  inviterUserId: string,
  organizationId: string,
  inviteeEmail: string,
  token: string,
): Promise<void> {
  try {
    const inviter = await prisma.user.findUnique({ where: { id: inviterUserId } });
    const org = await prisma.organization.findUnique({ where: { id: organizationId } });
    if (!inviter || !org) return;

    const inviterName = inviter.username || inviter.email || "Someone";
    const orgName = org.name;
    const inviteUrl = `${appUrl()}/app/accept-invitation/${token}`;

    await emailSender.send({
      to: inviteeEmail,
      subject: `You've been invited to join ${orgName}`,
      text: `${inviterName} has invited you to join ${orgName}.\n\nAccept invitation: ${inviteUrl}\n\nThis invitation expires in 7 days.`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">You've been invited to join ${escapeHtml(orgName)}</h2>
          <p style="color: #555; line-height: 1.6;">
            <strong>${escapeHtml(inviterName)}</strong> has invited you to join <strong>${escapeHtml(orgName)}</strong>.
          </p>
          <a href="${inviteUrl}" style="display: inline-block; padding: 12px 24px; background: #000; color: #fff; text-decoration: none; border-radius: 6px; margin: 16px 0;">Accept Invitation</a>
          <p style="color: #999; font-size: 13px;">This invitation expires in 7 days.</p>
        </div>
      `,
    });
  } catch (err) {
    console.error("Failed to send invitation email:", err);
  }
}

// --- Welcome Email ---
export async function sendWelcomeEmail(userId: string): Promise<void> {
  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user?.email) return;

    const name = user.username || "there";

    await emailSender.send({
      to: user.email,
      subject: "Welcome to AI Agent Platform",
      text: `Hi ${name},\n\nWelcome to AI Agent Platform! Here's what you can do:\n\n1. Create AI agents with custom instructions\n2. Add them to your websites with an embed code\n3. Capture and manage leads automatically\n4. Track conversations and analytics\n\nGet started: ${appUrl()}/app/dashboard\n\nNeed help? Reply to this email.`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Welcome to AI Agent Platform!</h2>
          <p style="color: #555; line-height: 1.6;">Hi ${escapeHtml(name)},</p>
          <p style="color: #555; line-height: 1.6;">Here's what you can do:</p>
          <ol style="color: #555; line-height: 1.8; padding-left: 20px;">
            <li>Create AI agents with custom instructions</li>
            <li>Add them to your websites with an embed code</li>
            <li>Capture and manage leads automatically</li>
            <li>Track conversations and analytics</li>
          </ol>
          <a href="${appUrl()}/app/dashboard" style="display: inline-block; padding: 12px 24px; background: #000; color: #fff; text-decoration: none; border-radius: 6px; margin: 16px 0;">Go to Dashboard</a>
          <p style="color: #999; font-size: 13px;">Need help? Reply to this email.</p>
        </div>
      `,
    });
  } catch (err) {
    console.error("Failed to send welcome email:", err);
  }
}

// --- Subscription Change Emails ---
export async function sendSubscriptionActivatedEmail(userId: string, planName: string): Promise<void> {
  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user?.email) return;

    await emailSender.send({
      to: user.email,
      subject: `Your ${planName} subscription is active`,
      text: `Your ${planName} subscription is now active. You have access to all ${planName} features.\n\nManage subscription: ${appUrl()}/app/settings`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Your ${escapeHtml(planName)} subscription is active</h2>
          <p style="color: #555; line-height: 1.6;">Your <strong>${escapeHtml(planName)}</strong> subscription is now active. You have access to all ${escapeHtml(planName)} features.</p>
          <a href="${appUrl()}/app/settings" style="display: inline-block; padding: 12px 24px; background: #000; color: #fff; text-decoration: none; border-radius: 6px; margin: 16px 0;">Manage Subscription</a>
        </div>
      `,
    });
  } catch (err) {
    console.error("Failed to send subscription activated email:", err);
  }
}

export async function sendSubscriptionCancelledEmail(userId: string, planName: string): Promise<void> {
  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user?.email) return;

    await emailSender.send({
      to: user.email,
      subject: `Your ${planName} subscription has been cancelled`,
      text: `Your ${planName} subscription has been cancelled. You'll retain access until the end of your billing period.\n\nResubscribe: ${appUrl()}/app/settings\n\nWe'd love to know why you left. Reply to this email with feedback.`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Your subscription has been cancelled</h2>
          <p style="color: #555; line-height: 1.6;">Your <strong>${escapeHtml(planName)}</strong> subscription has been cancelled. You'll retain access until the end of your billing period.</p>
          <a href="${appUrl()}/app/settings" style="display: inline-block; padding: 12px 24px; background: #000; color: #fff; text-decoration: none; border-radius: 6px; margin: 16px 0;">Resubscribe</a>
          <p style="color: #999; font-size: 13px;">We'd love to know why you left. Reply to this email with feedback.</p>
        </div>
      `,
    });
  } catch (err) {
    console.error("Failed to send subscription cancelled email:", err);
  }
}

// --- Limit Warning Emails ---
export async function sendLimitWarningEmail(
  organizationId: string,
  limitType: string,
  current: number,
  limit: number,
): Promise<void> {
  try {
    const members = await prisma.organizationMember.findMany({
      where: { organizationId },
      include: { user: { select: { email: true } } },
    });
    const emails = members
      .map((m) => m.user.email)
      .filter((e): e is string => !!e);

    if (emails.length === 0) return;

    const org = await prisma.organization.findUnique({ where: { id: organizationId } });
    const usagePercent = Math.round((current / limit) * 100);

    await emailSender.send({
      to: emails.join(","),
      subject: `Warning: ${limitType} usage at ${usagePercent}%`,
      text: `Your ${org?.name || "organization"} has used ${current} of ${limit} ${limitType} this month (${usagePercent}%).\n\nUpgrade your plan: ${appUrl()}/app/settings`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Usage Warning</h2>
          <p style="color: #555; line-height: 1.6;">Your <strong>${escapeHtml(org?.name || "organization")}</strong> has used <strong>${current}</strong> of <strong>${limit}</strong> ${escapeHtml(limitType)} this month (<strong>${usagePercent}%</strong>).</p>
          <a href="${appUrl()}/app/settings" style="display: inline-block; padding: 12px 24px; background: #000; color: #fff; text-decoration: none; border-radius: 6px; margin: 16px 0;">Upgrade Plan</a>
        </div>
      `,
    });
  } catch (err) {
    console.error("Failed to send limit warning email:", err);
  }
}

// --- Escalation Email ---
export async function sendEscalationEmail(
  organizationId: string,
  conversation: { id: string },
  reason?: string,
): Promise<void> {
  try {
    const members = await prisma.organizationMember.findMany({
      where: { organizationId },
      include: { user: { select: { email: true, username: true } } },
    });
    const emails = members
      .map((m) => m.user.email)
      .filter((e): e is string => !!e);

    if (emails.length === 0) return;

    const org = await prisma.organization.findUnique({ where: { id: organizationId } });

    await emailSender.send({
      to: emails.join(","),
      subject: `Conversation escalated - needs human attention`,
      text: `A conversation has been escalated to human support.\n\n${reason ? `Reason: ${reason}\n\n` : ""}View conversation: ${appUrl()}/app/conversations/${conversation.id}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #c00;">Conversation escalated - needs human attention</h2>
          <p style="color: #555; line-height: 1.6;">A conversation in <strong>${escapeHtml(org?.name || "your organization")}</strong> has been escalated to human support.</p>
          ${reason ? `<p style="color: #555; line-height: 1.6;"><strong>Reason:</strong> ${escapeHtml(reason)}</p>` : ""}
          <a href="${appUrl()}/app/conversations/${conversation.id}" style="display: inline-block; padding: 12px 24px; background: #c00; color: #fff; text-decoration: none; border-radius: 6px; margin: 16px 0;">View Conversation</a>
        </div>
      `,
    });
  } catch (err) {
    console.error("Failed to send escalation email:", err);
  }
}

// --- Utility ---
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
