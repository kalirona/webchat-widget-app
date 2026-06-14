import { type AuthUser } from "wasp/auth";
import { useQuery } from "wasp/client/operations";
import { getConversationMessages } from "wasp/client/operations";
import { useParams } from "react-router";
import { Link, routes } from "wasp/client/router";
import { MessageSquare, ArrowLeft, Loader2, Bot, User } from "lucide-react";
import { AppLayout } from "../layout/AppLayout";

export function ConversationDetailPage({ user }: { user: AuthUser }) {
  const { id } = useParams<{ id: string }>();
  const { data: messages, isLoading, error } = useQuery(getConversationMessages, { id: id! });

  if (error) {
    return (
      <AppLayout user={user}>
        <div className="flex h-full items-center justify-center">
          <div className="bg-card rounded-lg p-8 shadow-lg">
            <p className="text-2xl font-bold text-destructive">Error</p>
            <p className="text-muted-foreground mt-2 text-sm">{error.message}</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout user={user}>
      <div className="mb-6">
        <Link
          to={routes.ConversationsRoute.to}
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm font-medium transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Conversations
        </Link>
      </div>

      <div className="mb-6 flex items-center gap-3">
        <div className="bg-primary/10 text-primary rounded-lg p-2.5">
          <MessageSquare className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-title-md font-bold">Conversation</h1>
          <p className="text-muted-foreground text-xs">
            Started {messages && messages.length > 0
              ? new Date(messages[0].createdAt).toLocaleString()
              : ""}
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
        </div>
      ) : !messages || messages.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <MessageSquare className="text-muted-foreground mb-4 h-16 w-16" />
          <h2 className="text-title-sm font-semibold">No messages</h2>
          <p className="text-muted-foreground mt-2 text-sm">
            This conversation has no messages yet.
          </p>
        </div>
      ) : (
        <div className="bg-card rounded-lg border p-6 shadow-sm">
          <div className="space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.role === "assistant" ? "" : "flex-row-reverse"}`}
              >
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                    msg.role === "assistant"
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-foreground"
                  }`}
                >
                  {msg.role === "assistant" ? (
                    <Bot className="h-4 w-4" />
                  ) : (
                    <User className="h-4 w-4" />
                  )}
                </div>
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-3 ${
                    msg.role === "assistant"
                      ? "bg-muted"
                      : "bg-primary text-primary-foreground"
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  <p
                    className={`mt-1 text-xs ${
                      msg.role === "assistant"
                        ? "text-muted-foreground"
                        : "text-primary-foreground/70"
                    }`}
                  >
                    {new Date(msg.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </AppLayout>
  );
}
