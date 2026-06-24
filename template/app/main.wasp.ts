import { app, page, route, query, action, api, job } from "@wasp.sh/spec";

import { LandingPage } from "./src/landing-page/LandingPage" with { type: "ref" };
import { Login } from "./src/auth/LoginPage" with { type: "ref" };
import { Signup } from "./src/auth/SignupPage" with { type: "ref" };
import { RequestPasswordResetPage } from "./src/auth/email-and-pass/RequestPasswordResetPage" with { type: "ref" };
import { PasswordResetPage } from "./src/auth/email-and-pass/PasswordResetPage" with { type: "ref" };
import { EmailVerificationPage } from "./src/auth/email-and-pass/EmailVerificationPage" with { type: "ref" };
import { AccountPage } from "./src/user/AccountPage" with { type: "ref" };
import { DemoAppPage } from "./src/demo-ai-app/DemoAppPage" with { type: "ref" };
import { PricingPage } from "./src/payment/PricingPage" with { type: "ref" };
import { CheckoutResultPage } from "./src/payment/CheckoutResultPage" with { type: "ref" };
import { FeaturesPage } from "./src/marketing/FeaturesPage" with { type: "ref" };
import { FAQPage } from "./src/marketing/FAQPage" with { type: "ref" };
import { BlogPage } from "./src/marketing/BlogPage" with { type: "ref" };
import { ContactPage } from "./src/marketing/ContactPage" with { type: "ref" };
import { InstallationDocPage } from "./src/docs/InstallationDocPage" with { type: "ref" };
import { WordPressDocPage } from "./src/docs/WordPressDocPage" with { type: "ref" };
import { ShopifyDocPage } from "./src/docs/ShopifyDocPage" with { type: "ref" };
import { HtmlDocPage } from "./src/docs/HtmlDocPage" with { type: "ref" };
import { WebflowDocPage } from "./src/docs/WebflowDocPage" with { type: "ref" };
import { FileUploadPage } from "./src/file-upload/FileUploadPage" with { type: "ref" };
import { AnalyticsDashboardPage } from "./src/admin/dashboards/analytics/AnalyticsDashboardPage" with { type: "ref" };
import { UsersDashboardPage } from "./src/admin/dashboards/users/UsersDashboardPage" with { type: "ref" };
import { SettingsPage } from "./src/admin/elements/settings/SettingsPage" with { type: "ref" };
import { CalendarPage } from "./src/admin/elements/calendar/CalendarPage" with { type: "ref" };
import { ButtonsPage } from "./src/admin/elements/ui-elements/ButtonsPage" with { type: "ref" };
import { NotFoundPage } from "./src/client/components/NotFoundPage" with { type: "ref" };
import { AdminMessages } from "./src/admin/dashboards/messages/MessagesPage" with { type: "ref" };
import { DashboardPage } from "./src/app/dashboard/DashboardPage" with { type: "ref" };
import { AgentsPage } from "./src/app/agents/AgentsPage" with { type: "ref" };
import { NewAgentPage } from "./src/app/agents/NewAgentPage" with { type: "ref" };
import { EditAgentPage } from "./src/app/agents/EditAgentPage" with { type: "ref" };
import { AgentDetailPage } from "./src/app/agents/AgentDetailPage" with { type: "ref" };
import { WebsitesPage } from "./src/app/websites/WebsitesPage" with { type: "ref" };
import { NewWebsitePage } from "./src/app/websites/NewWebsitePage" with { type: "ref" };
import { EditWebsitePage } from "./src/app/websites/EditWebsitePage" with { type: "ref" };
import { TriggersPage } from "./src/app/triggers/TriggersPage" with { type: "ref" };
import { InstallPage } from "./src/app/install/InstallPage" with { type: "ref" };
import { ConversationsPage } from "./src/app/conversations/ConversationsPage" with { type: "ref" };
import { ConversationDetailPage } from "./src/app/conversations/ConversationDetailPage" with { type: "ref" };
import { LeadsPage } from "./src/app/leads/LeadsPage" with { type: "ref" };
import { AnalyticsPage } from "./src/app/analytics/AnalyticsPage" with { type: "ref" };
import { KnowledgeBasesPage } from "./src/app/knowledge/KnowledgeBasesPage" with { type: "ref" };
import { NewKnowledgeBasePage } from "./src/app/knowledge/NewKnowledgeBasePage" with { type: "ref" };
import { KnowledgeBaseDetailPage } from "./src/app/knowledge/KnowledgeBaseDetailPage" with { type: "ref" };
import { AppSettingsPage } from "./src/app/settings/AppSettingsPage" with { type: "ref" };
import { AcceptInvitationPage } from "./src/app/invitations/AcceptInvitationPage" with { type: "ref" };

import { App } from "./src/client/App" with { type: "ref" };

import { getVerificationEmailContent, getPasswordResetEmailContent } from "./src/auth/email-and-pass/emails" with { type: "ref" };
import { getEmailUserFields } from "./src/auth/userSignupFields" with { type: "ref" };

import { serverEnvValidationSchema } from "./src/env" with { type: "ref" };

import { seedMockUsers } from "./src/server/scripts/dbSeeds" with { type: "ref" };

import { getPaginatedUsers, updateIsUserAdminById } from "./src/user/operations" with { type: "ref" };

import { generateGptResponse, createTask, deleteTask, updateTask, getGptResponses, getAllTasksByUser } from "./src/demo-ai-app/operations" with { type: "ref" };

import { getCustomerPortalUrl, generateCheckoutSession } from "./src/payment/operations" with { type: "ref" };
import { paymentsWebhook, paymentsMiddlewareConfigFn } from "./src/payment/webhook" with { type: "ref" };

import { createFileUploadUrl, addFileToDb, getAllFilesByUser, getDownloadFileSignedURL, deleteFile } from "./src/file-upload/operations" with { type: "ref" };

import { getDailyStats } from "./src/analytics/operations" with { type: "ref" };
import { calculateDailyStats } from "./src/analytics/stats" with { type: "ref" };

import {
  getOrganization,
  getOrganizationMembers,
  getAgents,
  getAgent,
  getAgentStats,
  getWebsites,
  getWebsite,
  getConversations,
  getConversationMessages,
  getConversationsInbox,
  getConversationDetail,
  resolveConversation,
  assignConversation,
  escalateConversation,
  sendAgentMessage,
  setAgentTyping,
  getLeads,
  updateLead,
  deleteLead,
  createLead,
  getTriggers,
  createTrigger,
  updateTrigger,
  deleteTrigger,
  getDashboardStats,
  getAnalyticsData,
  getUsageQuota,
  createOrganization,
  updateOrganization,
  inviteMember,
  removeMember,
  createAgent,
  updateAgent,
  deleteAgent,
  createWebsite,
  updateWebsite,
  deleteWebsite,
  getKnowledgeBases,
  getKnowledgeBase,
  getKnowledgeDocuments,
  getAgentKnowledgeBases,
  createKnowledgeBase,
  deleteKnowledgeBase,
  uploadKnowledgeDocument,
  crawlUrl,
  crawlWebsite,
  deleteKnowledgeDocument,
  createCustomTextEntry,
  linkAgentToKnowledgeBase,
  unlinkAgentFromKnowledgeBase,
  getAiSettings,
  getAiUsage,
  updateAiSettings,
  verifyOrganizationSlug,
  getInvitations,
  getAuditLogs,
  sendInvitation,
  cancelInvitation,
  acceptInvitation,
} from "./src/app/operations" with { type: "ref" };

import {
  widgetGetConfig,
  widgetInit,
  widgetSendMessage,
  widgetGetMessages,
  widgetRequestHuman,
  widgetIsTyping,
} from "./src/app/widget/api" with { type: "ref" };

export default app({
  name: "OpenSaaS",
  wasp: {
    version: "^0.24.0",
  },
  title: "My Open SaaS App",
  head: [
    "<link rel='icon' href='/favicon.ico' />",
    "<meta name='description' content='Your apps main description and features.' />",
    "<meta name='author' content='Your (App) Name' />",
    "<meta name='keywords' content='saas, solution, product, app, service' />",
    "<meta property='og:type' content='website' />",
    "<meta property='og:title' content='Your Open SaaS App' />",
    "<meta property='og:site_name' content='Your Open SaaS App' />",
    "<meta property='og:url' content='https://your-saas-app.com' />",
    "<meta property='og:description' content='Your apps main description and features.' />",
    "<meta property='og:image' content='https://your-saas-app.com/public-banner.webp' />",
    "<meta name='twitter:image' content='https://your-saas-app.com/public-banner.webp' />",
    "<meta name='twitter:image:width' content='800' />",
    "<meta name='twitter:image:height' content='400' />",
    "<meta name='twitter:card' content='summary_large_image' />",
    "<script async data-domain='<your-site-id>' src='https://plausible.io/js/script.js'></script>",
    "<script async data-domain='<your-site-id>' src='https://plausible.io/js/script.local.js'></script>",
  ],
  auth: {
    userEntity: "User",
    methods: {
      email: {
        fromField: {
          name: "Open SaaS App",
          email: "me@example.com",
        },
        emailVerification: {
          clientRoute: "EmailVerificationRoute",
          getEmailContentFn: getVerificationEmailContent,
        },
        passwordReset: {
          clientRoute: "PasswordResetRoute",
          getEmailContentFn: getPasswordResetEmailContent,
        },
        userSignupFields: getEmailUserFields,
      },
    },
    onAuthFailedRedirectTo: "/login",
    onAuthSucceededRedirectTo: "/app/dashboard",
  },
  db: {
    seeds: [seedMockUsers],
  },
  client: {
    rootComponent: App,
  },
  server: {
    envValidationSchema: serverEnvValidationSchema,
  },
  emailSender: {
    provider: "SMTP",
    defaultFrom: {
      name: "Open SaaS App",
      email: "noreply@example.com",
    },
  },
  spec: [
    // Public Landing Page
    route("LandingPageRoute", "/", page(LandingPage), { prerender: true }),

    // Auth Pages
    route("LoginRoute", "/login", page(Login)),
    route("SignupRoute", "/signup", page(Signup)),
    route("RequestPasswordResetRoute", "/request-password-reset", page(RequestPasswordResetPage)),
    route("PasswordResetRoute", "/password-reset", page(PasswordResetPage)),
    route("EmailVerificationRoute", "/email-verification", page(EmailVerificationPage)),

    // User
    route("AccountRoute", "/account", page(AccountPage, { authRequired: true })),
    query(getPaginatedUsers, { entities: ["User"] }),
    action(updateIsUserAdminById, { entities: ["User"] }),

    // Demo AI App
    route("DemoAppRoute", "/demo-app", page(DemoAppPage, { authRequired: true })),
    action(generateGptResponse, { entities: ["User", "Task", "GptResponse"] }),
    action(createTask, { entities: ["Task"] }),
    action(deleteTask, { entities: ["Task"] }),
    action(updateTask, { entities: ["Task"] }),
    query(getGptResponses, { entities: ["User", "GptResponse"] }),
    query(getAllTasksByUser, { entities: ["Task"] }),

    // Payment
    route("PricingPageRoute", "/pricing", page(PricingPage), { prerender: true }),
    route("CheckoutResultRoute", "/checkout", page(CheckoutResultPage, { authRequired: true })),
    query(getCustomerPortalUrl, { entities: ["User"] }),
    action(generateCheckoutSession, { entities: ["User"] }),
    api("POST", "/payments-webhook", paymentsWebhook, { entities: ["User"], middlewareConfigFn: paymentsMiddlewareConfigFn }),

    // Public Marketing Pages
    route("FeaturesPageRoute", "/features", page(FeaturesPage), { prerender: true }),
    route("FAQPageRoute", "/faq", page(FAQPage), { prerender: true }),
    route("BlogPageRoute", "/blog", page(BlogPage)),
    route("ContactPageRoute", "/contact", page(ContactPage)),

    // Documentation Center
    route("InstallationDocPageRoute", "/docs/installation", page(InstallationDocPage), { prerender: true }),
    route("WordPressDocPageRoute", "/docs/wordpress", page(WordPressDocPage), { prerender: true }),
    route("ShopifyDocPageRoute", "/docs/shopify", page(ShopifyDocPage), { prerender: true }),
    route("HtmlDocPageRoute", "/docs/html", page(HtmlDocPage), { prerender: true }),
    route("WebflowDocPageRoute", "/docs/webflow", page(WebflowDocPage), { prerender: true }),

    // File Upload
    route("FileUploadRoute", "/file-upload", page(FileUploadPage, { authRequired: true })),
    action(createFileUploadUrl, { entities: ["User", "File"] }),
    action(addFileToDb, { entities: ["User", "File"] }),
    query(getAllFilesByUser, { entities: ["User", "File"] }),
    query(getDownloadFileSignedURL, { entities: ["User", "File"] }),
    action(deleteFile, { entities: ["User", "File"] }),

    // Analytics
    query(getDailyStats, { entities: ["User", "DailyStats"] }),
    job(calculateDailyStats, {
      executor: "PgBoss",
      schedule: { cron: "0 * * * *" },
      entities: ["User", "DailyStats", "Logs", "PageViewSource"],
    }),

    // Admin Dashboard
    route("AdminRoute", "/admin", page(AnalyticsDashboardPage, { authRequired: true })),
    route("AdminUsersRoute", "/admin/users", page(UsersDashboardPage, { authRequired: true })),
    route("AdminSettingsRoute", "/admin/settings", page(SettingsPage, { authRequired: true })),
    route("AdminCalendarRoute", "/admin/calendar", page(CalendarPage, { authRequired: true })),
    route("AdminUIButtonsRoute", "/admin/ui/buttons", page(ButtonsPage, { authRequired: true })),
    route("NotFoundRoute", "*", page(NotFoundPage)),
    route("AdminMessagesRoute", "/admin/messages", page(AdminMessages, { authRequired: true })),

    // App Dashboard (Multi-Tenant)
    route("DashboardRoute", "/app/dashboard", page(DashboardPage, { authRequired: true })),
    route("AgentsRoute", "/app/agents", page(AgentsPage, { authRequired: true })),
    route("NewAgentRoute", "/app/agents/new", page(NewAgentPage, { authRequired: true })),
    route("EditAgentRoute", "/app/agents/:id/edit", page(EditAgentPage, { authRequired: true })),
    route("AgentDetailRoute", "/app/agents/:id", page(AgentDetailPage, { authRequired: true })),
    route("WebsitesRoute", "/app/websites", page(WebsitesPage, { authRequired: true })),
    route("NewWebsiteRoute", "/app/websites/new", page(NewWebsitePage, { authRequired: true })),
    route("EditWebsiteRoute", "/app/websites/:id/edit", page(EditWebsitePage, { authRequired: true })),
    route("TriggersRoute", "/app/websites/:websiteId/triggers", page(TriggersPage, { authRequired: true })),
    route("InstallRoute", "/app/install", page(InstallPage, { authRequired: true })),
    route("ConversationsRoute", "/app/conversations", page(ConversationsPage, { authRequired: true })),
    route("ConversationDetailRoute", "/app/conversations/:id", page(ConversationDetailPage, { authRequired: true })),
    route("LeadsRoute", "/app/leads", page(LeadsPage, { authRequired: true })),
    route("AnalyticsRoute", "/app/analytics", page(AnalyticsPage, { authRequired: true })),
    route("KnowledgeBasesRoute", "/app/knowledge", page(KnowledgeBasesPage, { authRequired: true })),
    route("NewKnowledgeBaseRoute", "/app/knowledge/new", page(NewKnowledgeBasePage, { authRequired: true })),
    route("KnowledgeBaseDetailRoute", "/app/knowledge/:id", page(KnowledgeBaseDetailPage, { authRequired: true })),
    route("AppSettingsRoute", "/app/settings", page(AppSettingsPage, { authRequired: true })),
    route("AcceptInvitationRoute", "/app/accept-invitation/:token", page(AcceptInvitationPage, { authRequired: true })),

    // App Queries
    query(getOrganization, { entities: ["Organization", "OrganizationMember", "User"] }),
    query(getOrganizationMembers, { entities: ["Organization", "OrganizationMember", "User"] }),
    query(getAgents, { entities: ["Organization", "Agent"] }),
    query(getAgent, { entities: ["Organization", "Agent"] }),
    query(getAgentStats, { entities: ["Organization", "Agent", "Conversation", "Message", "Lead"] }),
    query(getWebsites, { entities: ["Organization", "Website"] }),
    query(getWebsite, { entities: ["Organization", "Website"] }),
    query(getConversations, { entities: ["Organization", "Conversation", "Message", "Lead"] }),
    query(getConversationMessages, { entities: ["Conversation", "Message"] }),
    query(getConversationsInbox, { entities: ["Organization", "Conversation", "Message", "Lead", "Agent", "Website", "Visitor", "User"] }),
    query(getConversationDetail, { entities: ["Organization", "Conversation", "Message", "Lead", "Agent", "Website", "Visitor"] }),
    action(resolveConversation, { entities: ["Organization", "Conversation"] }),
    action(assignConversation, { entities: ["Organization", "Conversation", "OrganizationMember"] }),
    action(escalateConversation, { entities: ["Organization", "Conversation", "Message"] }),
    action(sendAgentMessage, { entities: ["Organization", "Conversation", "Message"] }),
    action(setAgentTyping, { entities: ["Organization", "Conversation"] }),
    query(getLeads, { entities: ["Organization", "Lead", "Website", "Conversation", "Message"] }),
    action(updateLead, { entities: ["Organization", "Lead"] }),
    action(deleteLead, { entities: ["Organization", "Lead", "Conversation"] }),
    action(createLead, { entities: ["Organization", "Lead", "Website", "User", "OrganizationMember"] }),
    query(getTriggers, { entities: ["Organization", "Website", "Trigger", "Agent"] }),
    action(createTrigger, { entities: ["Organization", "Website", "Trigger", "Agent"] }),
    action(updateTrigger, { entities: ["Organization", "Website", "Trigger"] }),
    action(deleteTrigger, { entities: ["Organization", "Website", "Trigger"] }),
    query(getDashboardStats, { entities: ["Organization", "Agent", "Website", "Conversation", "Lead"] }),
    query(getAnalyticsData, { entities: ["Organization", "Conversation", "Message", "Lead", "AiUsage", "Visitor"] }),
    query(getUsageQuota, { entities: ["Organization", "OrganizationMember", "Website", "Conversation", "AiUsage"] }),

    // App Actions
    action(createOrganization, { entities: ["Organization", "OrganizationMember", "User"] }),
    action(updateOrganization, { entities: ["Organization"] }),
    action(inviteMember, { entities: ["Organization", "OrganizationMember", "User"] }),
    action(removeMember, { entities: ["OrganizationMember"] }),
    action(createAgent, { entities: ["Organization", "Agent"] }),
    action(updateAgent, { entities: ["Agent"] }),
    action(deleteAgent, { entities: ["Agent"] }),
    action(createWebsite, { entities: ["Organization", "Website"] }),
    action(updateWebsite, { entities: ["Website"] }),
    action(deleteWebsite, { entities: ["Website"] }),

    // Knowledge Base Queries
    query(getKnowledgeBases, { entities: ["Organization", "KnowledgeBase", "KnowledgeDocument"] }),
    query(getKnowledgeBase, { entities: ["Organization", "KnowledgeBase", "KnowledgeDocument", "DocumentChunk", "Agent", "AgentKnowledgeBase"] }),
    query(getKnowledgeDocuments, { entities: ["Organization", "KnowledgeBase", "KnowledgeDocument", "DocumentChunk"] }),
    query(getAgentKnowledgeBases, { entities: ["Agent", "KnowledgeBase", "AgentKnowledgeBase"] }),

    // Knowledge Base Actions
    action(createKnowledgeBase, { entities: ["Organization", "KnowledgeBase"] }),
    action(deleteKnowledgeBase, { entities: ["KnowledgeBase", "KnowledgeDocument", "DocumentChunk", "AgentKnowledgeBase"] }),
    action(uploadKnowledgeDocument, { entities: ["KnowledgeBase", "KnowledgeDocument", "DocumentChunk"] }),
    action(crawlUrl, { entities: ["KnowledgeBase", "KnowledgeDocument", "DocumentChunk"] }),
    action(crawlWebsite, { entities: ["KnowledgeBase", "KnowledgeDocument", "DocumentChunk"] }),
    action(deleteKnowledgeDocument, { entities: ["KnowledgeDocument", "DocumentChunk"] }),
    action(createCustomTextEntry, { entities: ["KnowledgeBase", "KnowledgeDocument", "DocumentChunk"] }),
    action(linkAgentToKnowledgeBase, { entities: ["Agent", "KnowledgeBase", "AgentKnowledgeBase"] }),
    action(unlinkAgentFromKnowledgeBase, { entities: ["AgentKnowledgeBase"] }),

    // AI Settings
    query(getAiSettings, { entities: ["Organization"] }),
    query(getAiUsage, { entities: ["Organization", "AiUsage"] }),
    action(updateAiSettings, { entities: ["Organization"] }),

    // Organization Settings
    query(verifyOrganizationSlug, { entities: ["Organization"] }),
    query(getInvitations, { entities: ["Organization", "Invitation", "User"] }),
    query(getAuditLogs, { entities: ["Organization", "AuditLog", "User"] }),
    action(sendInvitation, { entities: ["Organization", "OrganizationMember", "Invitation", "User", "AuditLog"] }),
    action(cancelInvitation, { entities: ["Organization", "Invitation", "AuditLog"] }),
    action(acceptInvitation, { entities: ["Organization", "OrganizationMember", "Invitation", "User", "AuditLog"] }),

    // Widget API
    api("GET", "/api/widget/:websiteId/config", widgetGetConfig),
    api("POST", "/api/widget/init", widgetInit),
    api("POST", "/api/widget/message", widgetSendMessage),
    api("GET", "/api/widget/messages/:conversationId", widgetGetMessages),
    api("POST", "/api/widget/handoff", widgetRequestHuman),
    api("GET", "/api/widget/typing/:conversationId", widgetIsTyping),
  ],
});
