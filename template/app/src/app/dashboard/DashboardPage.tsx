import { memo } from "react";
import { type AuthUser } from "wasp/auth";
import { useQuery } from "wasp/client/operations";
import { getDashboardStats, getOrganization } from "wasp/client/operations";
import { Link, routes } from "wasp/client/router";
import { Bot, Globe, MessageSquare, Users, Plus, ArrowRight, Sparkles, Zap, Target } from "lucide-react";
import { AppLayout } from "../layout/AppLayout";

export function DashboardPage({ user }: { user: AuthUser }) {
  const { data: stats, isLoading, error } = useQuery(getDashboardStats) as any
  const { data: org } = useQuery(getOrganization) as any;

  if (error) {
    return (
      <AppLayout user={user}>
        <div className="flex h-full items-center justify-center">
          <div className="bg-card rounded-2xl p-10 shadow-lg">
            <p className="text-2xl font-bold text-destructive">Error</p>
            <p className="text-muted-foreground mt-2 text-sm">
              {error.message || "Something went wrong."}
            </p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout user={user}>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight lg:text-4xl">Dashboard</h1>
        <p className="text-muted-foreground mt-2 text-base lg:text-lg">
          Welcome back{user.username ? `, ${user.username}` : ""}
          {org ? ` · ${org.name}` : ""}
        </p>
      </div>

      {isLoading ? (
        /* Loading Skeleton */
        <div className="space-y-8">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-card animate-pulse rounded-2xl border border-border/50 p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="space-y-3">
                    <div className="bg-muted h-4 w-24 rounded-lg" />
                    <div className="bg-muted h-8 w-16 rounded-lg" />
                  </div>
                  <div className="bg-muted h-12 w-12 rounded-xl" />
                </div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            <div className="bg-card animate-pulse rounded-2xl border border-border/50 p-6 shadow-sm lg:col-span-2">
              <div className="bg-muted mb-6 h-5 w-40 rounded-lg" />
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="bg-muted h-16 rounded-xl" />
                ))}
              </div>
            </div>
            <div className="bg-card animate-pulse rounded-2xl border border-border/50 p-6 shadow-sm">
              <div className="bg-muted mb-6 h-5 w-32 rounded-lg" />
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="bg-muted h-14 rounded-xl" />
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : !stats || (stats.totalAgents === 0 && stats.totalWebsites === 0) ? (
        /* Empty State */
        <div className="flex flex-col items-center justify-center py-24">
          <div className="bg-primary/10 mb-6 flex h-20 w-20 items-center justify-center rounded-2xl">
            <Sparkles className="text-primary h-10 w-10" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight lg:text-3xl">Welcome to AI Agent</h2>
          <p className="text-muted-foreground mt-3 mb-8 max-w-lg text-center text-base lg:text-lg">
            Get started by creating your first AI agent and connecting it to your website to engage with visitors.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              to={routes.NewAgentRoute.to}
              className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold transition-all shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30"
            >
              <Plus className="h-5 w-5" />
              Create Your First Agent
            </Link>
            <Link
              to={routes.AppSettingsRoute.to}
              className="border-border/50 bg-background hover:bg-muted inline-flex items-center gap-2 rounded-xl border px-6 py-3 text-sm font-semibold transition-all"
            >
              <Zap className="h-5 w-5" />
              Configure Settings
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* Stat Cards */}
          <div className="mb-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Total Agents"
              value={stats.totalAgents}
              subtitle={`${stats.activeAgents} active`}
              icon={Bot}
              color="blue"
            />
            <StatCard
              title="Websites"
              value={stats.totalWebsites}
              icon={Globe}
              color="emerald"
            />
            <StatCard
              title="Conversations"
              value={stats.totalConversations}
              icon={MessageSquare}
              color="violet"
            />
            <StatCard
              title="Leads"
              value={stats.totalLeads}
              subtitle={`${stats.newLeads} new`}
              icon={Target}
              color="amber"
            />
          </div>

          {/* Content Grid */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            {/* Recent Conversations */}
            <div className="bg-card rounded-2xl border border-border/50 p-6 shadow-sm lg:col-span-2">
              <div className="mb-5 flex items-center justify-between">
                <h3 className="text-lg font-semibold">Recent Conversations</h3>
                <Link
                  to={routes.ConversationsRoute.to}
                  className="text-primary hover:text-primary/80 inline-flex items-center gap-1.5 text-sm font-medium transition-colors"
                >
                  View all
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
              {stats.recentConversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="bg-muted/50 mb-4 flex h-14 w-14 items-center justify-center rounded-xl">
                    <MessageSquare className="text-muted-foreground h-7 w-7" />
                  </div>
                  <p className="text-muted-foreground text-center text-sm">
                    No conversations yet. Once your AI agent is embedded on your website, conversations will appear here.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {stats.recentConversations.map((conv) => (
                    <Link
                      key={conv.id}
                      to={routes.ConversationDetailRoute.to.replace(":id", conv.id) as any}
                      className="hover:bg-muted/50 flex items-center justify-between rounded-xl px-4 py-3 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-sm font-semibold text-primary">
                          {(conv.leadName || conv.visitorId || "A").charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{conv.leadName || conv.visitorId || "Anonymous"}</p>
                          <p className="text-muted-foreground text-xs">{conv.createdAt.toLocaleDateString()}</p>
                        </div>
                      </div>
                      <ArrowRight className="text-muted-foreground h-4 w-4" />
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="bg-card rounded-2xl border border-border/50 p-6 shadow-sm">
              <h3 className="text-lg font-semibold mb-5">Quick Actions</h3>
              <div className="space-y-3">
                <Link
                  to={routes.NewAgentRoute.to}
                  className="hover:bg-primary/5 group flex items-center gap-3 rounded-xl border border-border/50 px-4 py-3.5 text-sm font-medium transition-all hover:border-primary/20 hover:shadow-sm"
                >
                  <div className="bg-primary/10 group-hover:bg-primary/20 flex h-10 w-10 items-center justify-center rounded-xl transition-colors">
                    <Bot className="text-primary h-5 w-5" />
                  </div>
                  Create New Agent
                </Link>
                <Link
                  to={routes.NewWebsiteRoute.to}
                  className="hover:bg-primary/5 group flex items-center gap-3 rounded-xl border border-border/50 px-4 py-3.5 text-sm font-medium transition-all hover:border-primary/20 hover:shadow-sm"
                >
                  <div className="bg-emerald-500/10 group-hover:bg-emerald-500/20 flex h-10 w-10 items-center justify-center rounded-xl transition-colors">
                    <Globe className="text-emerald-500 h-5 w-5" />
                  </div>
                  Add Website
                </Link>
                <Link
                  to={routes.AppSettingsRoute.to}
                  className="hover:bg-primary/5 group flex items-center gap-3 rounded-xl border border-border/50 px-4 py-3.5 text-sm font-medium transition-all hover:border-primary/20 hover:shadow-sm"
                >
                  <div className="bg-violet-500/10 group-hover:bg-violet-500/20 flex h-10 w-10 items-center justify-center rounded-xl transition-colors">
                    <Users className="text-violet-500 h-5 w-5" />
                  </div>
                  Manage Team
                </Link>
              </div>
            </div>
          </div>
        </>
      )}
    </AppLayout>
  );
}

const COLOR_CLASSES = {
  blue: "bg-blue-500/10 text-blue-500",
  emerald: "bg-emerald-500/10 text-emerald-500",
  violet: "bg-violet-500/10 text-violet-500",
  amber: "bg-amber-500/10 text-amber-500",
} as const;

const StatCard = memo(function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color,
}: {
  title: string;
  value: number;
  subtitle?: string;
  icon: React.ElementType;
  color: "blue" | "emerald" | "violet" | "amber";
}) {
  return (
    <div className="bg-card rounded-2xl border border-border/50 p-6 shadow-sm transition-all hover:shadow-md">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-muted-foreground text-sm font-medium">{title}</p>
          <p className="text-3xl font-bold tracking-tight mt-1">{value}</p>
          {subtitle && (
            <p className="text-muted-foreground mt-1 text-xs">{subtitle}</p>
          )}
        </div>
        <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${COLOR_CLASSES[color]}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
});





