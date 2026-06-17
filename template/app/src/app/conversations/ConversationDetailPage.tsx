import { useCallback, useState, useRef, useEffect } from "react";
import { type AuthUser } from "wasp/auth";
import { useQuery, useAction } from "wasp/client/operations";
import { getConversationDetail, resolveConversation, assignConversation, escalateConversation, sendAgentMessage, setAgentTyping } from "wasp/client/operations";
import { useParams } from "react-router";
import { Link, routes } from "wasp/client/router";
import { MessageSquare, ArrowLeft, Bot, User, CheckCircle, UserPlus, AlertTriangle, Loader2, Phone, Mail, Globe, Monitor, Send, Pencil } from "lucide-react";
import { AppLayout } from "../layout/AppLayout";

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    bot: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    human: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    escalated: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    resolved: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status] || styles.bot}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

export function ConversationDetailPage({ user }: { user: AuthUser }) {
  const { id } = useParams<{ id: string }>();
  const { data: detail, isLoading, error, refetch } = useQuery(getConversationDetail, { id: id! });
  const resolveAction = useAction(resolveConversation);
  const assignAction = useAction(assignConversation);
  const escalateAction = useAction(escalateConversation);
  const [resolving, setResolving] = useState(false);

  const handleResolve = useCallback(async () => {
    if (!id) return;
    setResolving(true);
    try {
      await resolveAction({ id });
      refetch();
    } finally {
      setResolving(false);
    }
  }, [id, resolveAction, refetch]);

  const handleAssignSelf = useCallback(async () => {
    if (!id) return;
    try {
      await assignAction({ id });
      refetch();
    } catch {}
  }, [id, assignAction, refetch]);

  const handleEscalate = useCallback(async () => {
    if (!id) return;
    try {
      await escalateAction({ id, reason: "User requested in conversation view" });
      refetch();
    } catch {}
  }, [id, escalateAction, refetch]);

  // --- Live Reply ---
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const sendMsg = useAction(sendAgentMessage);
  const setTyping = useAction(setAgentTyping);

  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleReplyChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setReplyText(e.target.value);
    // Send typing indicator
    if (id) {
      setTyping({ conversationId: id, isTyping: true }).catch(() => {});
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        setTyping({ conversationId: id!, isTyping: false }).catch(() => {});
      }, 3000);
    }
  }, [id, setTyping]);

  const handleSendReply = useCallback(async () => {
    if (!id || !replyText.trim() || sending) return;
    setSending(true);
    try {
      await sendMsg({ conversationId: id, content: replyText.trim() });
      setReplyText("");
      setTyping({ conversationId: id, isTyping: false }).catch(() => {});
      refetch();
    } finally {
      setSending(false);
    }
  }, [id, replyText, sending, sendMsg, setTyping, refetch]);

  const handleReplyKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendReply();
    }
  }, [handleSendReply]);

  // Clear typing on unmount
  useEffect(() => {
    return () => {
      if (id) setTyping({ conversationId: id, isTyping: false }).catch(() => {});
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [id, setTyping]);

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
      <div className="mb-6">
        <Link
          to={routes.ConversationsRoute.to}
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm font-medium transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Inbox
        </Link>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
        </div>
      ) : !detail ? (
        <div className="flex flex-col items-center justify-center py-20">
          <MessageSquare className="text-muted-foreground mb-4 h-16 w-16" />
          <h2 className="text-xl font-semibold">Conversation not found</h2>
        </div>
      ) : (
        <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden">
          <div className="flex h-[calc(100vh-280px)] min-h-[500px]">
              <div className="flex flex-1 flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto px-6 py-4">
                  <div className="w-full max-w-3xl mx-auto space-y-4">
                    {detail.messages?.length === 0 ? (
                      <div className="flex items-center justify-center py-20">
                        <div className="text-center">
                          <MessageSquare className="text-muted-foreground mx-auto mb-3 h-12 w-12" />
                          <p className="text-muted-foreground text-sm">No messages yet</p>
                        </div>
                      </div>
                    ) : (
                      detail.messages?.map((msg: any) => (
                        <div key={msg.id} className={`flex gap-3 ${msg.role === "assistant" ? "" : "flex-row-reverse"}`}>
                          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                            msg.role === "assistant" ? "bg-primary/10 text-primary" : msg.role === "system" ? "bg-amber-100 text-amber-700" : "bg-muted text-foreground"
                          }`}>
                            {msg.role === "assistant" ? <Bot className="h-4 w-4" /> : msg.role === "system" ? <AlertTriangle className="h-4 w-4" /> : <User className="h-4 w-4" />}
                          </div>
                          <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                            msg.role === "assistant" ? "bg-muted" : msg.role === "system" ? "bg-amber-50 text-amber-800 dark:bg-amber-900/20 dark:text-amber-200" : "bg-primary text-primary-foreground"
                          }`}>
                            <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                            <p className={`mt-1 text-xs ${msg.role === "assistant" ? "text-muted-foreground" : "text-primary-foreground/70"}`}>
                              {new Date(msg.createdAt).toLocaleString()}
                              {msg.tokens && <span> · {msg.tokens} tokens</span>}
                              {msg.cost && <span> · ${msg.cost.toFixed(4)}</span>}
                              {msg.model && <span> · {msg.model}</span>}
                              {msg.source === "dashboard" && <span> · <span className="text-green-600">Agent reply</span></span>}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Reply input */}
                <div className="border-t border-border/50 px-6 py-4">
                  <div className="flex gap-3">
                    <textarea
                      value={replyText}
                      onChange={handleReplyChange}
                      onKeyDown={handleReplyKeyDown}
                      placeholder="Type your reply... (Enter to send, Shift+Enter for new line)"
                      rows={2}
                      className="bg-muted flex-1 resize-none rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                    />
                    <button
                      onClick={handleSendReply}
                      disabled={!replyText.trim() || sending}
                      className="bg-primary text-primary-foreground hover:bg-primary/90 flex shrink-0 items-center gap-2 rounded-xl px-5 py-3 text-sm font-medium transition-colors disabled:opacity-50"
                    >
                      {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      Send
                    </button>
                  </div>
                </div>
              </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-semibold">{detail.lead?.name || detail.visitor?.name || "Anonymous Visitor"}</h2>
                      <StatusBadge status={detail.status} />
                    </div>
                    <p className="text-muted-foreground text-xs">{detail.lead?.email || detail.visitor?.email || "No email"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {detail.status !== "resolved" && (
                    <>
                      {detail.status !== "human" && (
                        <button onClick={handleAssignSelf} className="hover:bg-muted flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors">
                          <UserPlus className="h-3.5 w-3.5" /> Assign me
                        </button>
                      )}
                      {detail.status !== "escalated" && (
                        <button onClick={handleEscalate} className="hover:bg-red-50 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-red-600 transition-colors dark:hover:bg-red-900/20">
                          <AlertTriangle className="h-3.5 w-3.5" /> Escalate
                        </button>
                      )}
                      <button onClick={handleResolve} disabled={resolving} className="hover:bg-muted flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors">
                        <CheckCircle className="h-3.5 w-3.5" /> {resolving ? "Resolving..." : "Resolve"}
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="flex flex-1 overflow-y-auto px-6 py-4">
                <div className="w-full max-w-3xl mx-auto space-y-4">
                  {detail.messages?.length === 0 ? (
                    <div className="flex flex-1 items-center justify-center py-20">
                      <div className="text-center">
                        <MessageSquare className="text-muted-foreground mx-auto mb-3 h-12 w-12" />
                        <p className="text-muted-foreground text-sm">No messages yet</p>
                      </div>
                    </div>
                  ) : (
                    detail.messages?.map((msg: any) => (
                      <div key={msg.id} className={`flex gap-3 ${msg.role === "assistant" ? "" : "flex-row-reverse"}`}>
                        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                          msg.role === "assistant" ? "bg-primary/10 text-primary" : msg.role === "system" ? "bg-amber-100 text-amber-700" : "bg-muted text-foreground"
                        }`}>
                          {msg.role === "assistant" ? <Bot className="h-4 w-4" /> : msg.role === "system" ? <AlertTriangle className="h-4 w-4" /> : <User className="h-4 w-4" />}
                        </div>
                        <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                          msg.role === "assistant" ? "bg-muted" : msg.role === "system" ? "bg-amber-50 text-amber-800 dark:bg-amber-900/20 dark:text-amber-200" : "bg-primary text-primary-foreground"
                        }`}>
                          <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                          <p className={`mt-1 text-xs ${msg.role === "assistant" ? "text-muted-foreground" : "text-primary-foreground/70"}`}>
                            {new Date(msg.createdAt).toLocaleString()}
                            {msg.tokens && <span> · {msg.tokens} tokens</span>}
                            {msg.cost && <span> · ${msg.cost.toFixed(4)}</span>}
                            {msg.model && <span> · {msg.model}</span>}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="w-72 shrink-0 border-l border-border/50 p-5 overflow-y-auto">
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Visitor Info</h3>
              <div className="space-y-5">
                {detail.visitor && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <User className="text-muted-foreground h-4 w-4" />
                      <span>{detail.visitor.name || "Unknown"}</span>
                    </div>
                    {detail.visitor.email && (
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="text-muted-foreground h-4 w-4" />
                        <a href={`mailto:${detail.visitor.email}`} className="hover:text-primary truncate">{detail.visitor.email}</a>
                      </div>
                    )}
                    {detail.visitor.pageUrl && (
                      <div className="flex items-center gap-2 text-sm">
                        <Globe className="text-muted-foreground h-4 w-4" />
                        <span className="truncate text-xs">{detail.visitor.pageUrl}</span>
                      </div>
                    )}
                    {detail.visitor.userAgent && (
                      <div className="flex items-start gap-2 text-sm">
                        <Monitor className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
                        <span className="text-muted-foreground text-xs leading-relaxed">{detail.visitor.userAgent}</span>
                      </div>
                    )}
                  </div>
                )}

                {detail.lead && (
                  <div>
                    <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Lead</h4>
                    <div className="space-y-2">
                      <p className="text-sm">{detail.lead.name || "No name"}</p>
                      {detail.lead.email && (
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="text-muted-foreground h-4 w-4" />
                          <a href={`mailto:${detail.lead.email}`} className="hover:text-primary truncate">{detail.lead.email}</a>
                        </div>
                      )}
                      {detail.lead.phone && (
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="text-muted-foreground h-4 w-4" />
                          <span>{detail.lead.phone}</span>
                        </div>
                      )}
                      <StatusBadge status={detail.lead.status} />
                    </div>
                  </div>
                )}

                {detail.website && (
                  <div>
                    <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Source</h4>
                    <p className="text-sm">{detail.website.name}</p>
                    <p className="text-muted-foreground truncate text-xs">{detail.website.url}</p>
                  </div>
                )}

                {detail.agent && (
                  <div>
                    <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">AI Agent</h4>
                    <p className="text-sm">{detail.agent.name}</p>
                  </div>
                )}

                <div>
                  <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Timeline</h4>
                  <p className="text-muted-foreground text-xs">Created: {new Date(detail.createdAt).toLocaleString()}</p>
                  {detail.lastMessageAt && <p className="text-muted-foreground text-xs">Last activity: {new Date(detail.lastMessageAt).toLocaleString()}</p>}
                  {detail.resolvedAt && <p className="text-muted-foreground text-xs">Resolved: {new Date(detail.resolvedAt).toLocaleString()}</p>}
                </div>

                {detail.visitorHistory?.length > 0 && (
                  <div>
                    <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Previous Conversations</h4>
                    <div className="space-y-2">
                      {detail.visitorHistory.map((vc: any) => (
                        <Link
                          key={vc.id}
                          to={routes.ConversationDetailRoute.to.replace(":id", vc.id)}
                          className="hover:bg-muted/50 block rounded-lg border border-border/50 px-3 py-2 transition-colors"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-medium">
                              {new Date(vc.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                            </span>
                            <StatusBadge status={vc.status || "bot"} />
                          </div>
                          <p className="text-muted-foreground mt-0.5 text-xs">
                            {vc.messageCount} message{vc.messageCount !== 1 ? "s" : ""}
                            {vc.lastMessageAt && ` · Last ${new Date(vc.lastMessageAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`}
                          </p>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
