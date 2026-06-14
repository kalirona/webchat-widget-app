import { type AuthUser } from "wasp/auth";
import { useQuery } from "wasp/client/operations";
import { getConversations } from "wasp/client/operations";
import { Link, routes } from "wasp/client/router";
import { MessageSquare, ArrowRight } from "lucide-react";
import { AppLayout } from "../layout/AppLayout";

export function ConversationsPage({ user }: { user: AuthUser }) {
  const { data: conversations, isLoading, error } = useQuery(getConversations);

  if (error) {
    return (
      <AppLayout user={user}>
        <div className="flex h-full items-center justify-center">
          <div className="bg-card rounded-2xl p-10 shadow-lg">
            <p className="text-2xl font-bold text-destructive">Error</p>
            <p className="text-muted-foreground mt-2 text-sm">{error.message}</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout user={user}>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight lg:text-4xl">Conversations</h1>
        <p className="text-muted-foreground mt-2 text-base lg:text-lg">
          Chat history between your AI agents and website visitors
        </p>
      </div>

      {/* Loading */}
      {isLoading ? (
        <div className="bg-card rounded-2xl border border-border/50 shadow-sm">
          <div className="divide-y divide-border/50">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="animate-pulse px-6 py-5">
                <div className="flex items-center gap-4">
                  <div className="bg-muted h-12 w-12 rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <div className="bg-muted h-5 w-48 rounded-lg" />
                    <div className="bg-muted h-4 w-32 rounded-lg" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : !conversations || conversations.length === 0 ? (
        /* Empty State */
        <div className="flex flex-col items-center justify-center py-24">
          <div className="bg-primary/10 mb-6 flex h-20 w-20 items-center justify-center rounded-2xl">
            <MessageSquare className="text-primary h-10 w-10" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight">No conversations yet</h2>
          <p className="text-muted-foreground mt-3 max-w-lg text-center text-base">
            When visitors interact with your AI agent on your website, their conversations will appear here.
          </p>
        </div>
      ) : (
        /* Conversation List */
        <div className="bg-card rounded-2xl border border-border/50 shadow-sm">
          <div className="divide-y divide-border/50">
            {conversations.map((conv) => (
              <Link
                key={conv.id}
                to={routes.ConversationDetailRoute.to.replace(":id", conv.id)}
                className="hover:bg-muted/50 flex items-center justify-between px-6 py-5 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-sm font-semibold text-primary">
                    {(conv.leadName || conv.visitorId || "A").charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <p className="font-semibold">
                        {conv.leadName || conv.visitorId || "Anonymous Visitor"}
                      </p>
                      {conv.leadEmail && (
                        <span className="text-muted-foreground text-xs">
                          {conv.leadEmail}
                        </span>
                      )}
                    </div>
                    <div className="text-muted-foreground mt-1 flex items-center gap-3 text-xs">
                      <span>{conv.createdAt.toLocaleDateString()} {conv.createdAt.toLocaleTimeString()}</span>
                      <span>{conv.messageCount} message{conv.messageCount !== 1 ? "s" : ""}</span>
                      {conv.agentName && <span>Agent: {conv.agentName}</span>}
                      {conv.websiteName && <span>Site: {conv.websiteName}</span>}
                    </div>
                  </div>
                </div>
                <ArrowRight className="text-muted-foreground h-4 w-4" />
              </Link>
            ))}
          </div>
        </div>
      )}
    </AppLayout>
  );
}
