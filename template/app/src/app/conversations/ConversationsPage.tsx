import { useState, useCallback, useEffect, useRef } from "react";
import { type AuthUser } from "wasp/auth";
import { useQuery, useAction } from "wasp/client/operations";
import { getConversationsInbox, resolveConversation, assignConversation, sendAgentMessage, setAgentTyping } from "wasp/client/operations";
import { Link, routes } from "wasp/client/router";
import { useParams } from "react-router";
import { MessageSquare, Search, Bot, User, Phone, Mail, Globe, CheckCircle, UserPlus, AlertTriangle, ArrowLeft, Loader2, Monitor, Send, Pencil } from "lucide-react";
import { AppLayout } from "../layout/AppLayout";

const STATUS_TABS = [
  { value: "all", label: "All", icon: MessageSquare },
  { value: "unresolved", label: "Unresolved", icon: AlertTriangle },
  { value: "bot", label: "AI", icon: Bot },
  { value: "human", label: "Human", icon: User },
  { value: "escalated", label: "Escalated", icon: AlertTriangle },
  { value: "resolved", label: "Resolved", icon: CheckCircle },
] as const;

type StatusValue = typeof STATUS_TABS[number]["value"];

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    bot: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    human: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    escalated: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    resolved: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status] || styles.bot}`}>
      {status === "bot" && <Bot className="h-3 w-3" />}
      {status === "human" && <User className="h-3 w-3" />}
      {status === "escalated" && <AlertTriangle className="h-3 w-3" />}
      {status === "resolved" && <CheckCircle className="h-3 w-3" />}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function ConversationPanel({ conversation, user, onClose }: { conversation: any; user: AuthUser; onClose: () => void }) {
  const resolveAction = useAction(resolveConversation);
  const assignAction = useAction(assignConversation);
  const sendMsg = useAction(sendAgentMessage);
  const setTyping = useAction(setAgentTyping);
  const [resolving, setResolving] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleResolve = useCallback(async () => {
    setResolving(true);
    try {
      await resolveAction({ id: conversation.id });
    } finally {
      setResolving(false);
    }
  }, [conversation.id, resolveAction]);

  const handleAssignSelf = useCallback(async () => {
    try {
      await assignAction({ id: conversation.id });
    } catch {}
  }, [conversation.id, assignAction]);

  const handleEscalate = useCallback(async () => {
    try {
      await assignAction({ id: conversation.id, userId: undefined });
    } catch {}
  }, [conversation.id, assignAction]);

  const handleReplyChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setReplyText(e.target.value);
    setTyping({ conversationId: conversation.id, isTyping: true }).catch(() => {});
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setTyping({ conversationId: conversation.id, isTyping: false }).catch(() => {});
    }, 3000);
  }, [conversation.id, setTyping]);

  const handleSendReply = useCallback(async () => {
    if (!replyText.trim() || sending) return;
    setSending(true);
    try {
      await sendMsg({ conversationId: conversation.id, content: replyText.trim() });
      setReplyText("");
      setTyping({ conversationId: conversation.id, isTyping: false }).catch(() => {});
    } finally {
      setSending(false);
    }
  }, [replyText, sending, conversation.id, sendMsg, setTyping]);

  const handleReplyKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendReply();
    }
  }, [handleSendReply]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, []);

  const hasPreviousMessages = conversation.messages && conversation.messages.length > 0;
  const hasDetailMessages = conversation.messages?.length > 0;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-border/50 px-6 py-4">
        <button onClick={onClose} className="hover:bg-muted rounded-lg p-1.5 transition-colors md:hidden">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">{conversation.leadName || conversation.visitor?.name || "Anonymous Visitor"}</h2>
            <StatusBadge status={conversation.status} />
          </div>
          <p className="text-muted-foreground text-xs">{conversation.leadEmail || conversation.visitor?.email || "No email"}</p>
        </div>
        <div className="flex items-center gap-2">
          {conversation.status !== "resolved" && (
            <>
              {conversation.status !== "human" && (
                <button onClick={handleAssignSelf} className="hover:bg-muted flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors">
                  <UserPlus className="h-3.5 w-3.5" /> Assign me
                </button>
              )}
              {conversation.status !== "escalated" && (
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

      <div className="flex flex-1 overflow-hidden">
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {!hasDetailMessages ? (
              <div className="flex h-full items-center justify-center">
                <div className="text-center">
                  <MessageSquare className="text-muted-foreground mx-auto mb-3 h-12 w-12" />
                  <p className="text-muted-foreground text-sm">No messages yet</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {conversation.messages?.map((msg: any) => (
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
                        {msg.source === "dashboard" && <span> · <span className="text-green-600">Agent reply</span></span>}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
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

        <div className="w-72 shrink-0 border-l border-border/50 p-5">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Visitor Info</h3>
          <div className="space-y-4">
            {conversation.visitor && (
              <div className="space-y-2">
                {conversation.visitor.name && (
                  <div className="flex items-center gap-2 text-sm">
                    <User className="text-muted-foreground h-4 w-4" />
                    <span>{conversation.visitor.name}</span>
                  </div>
                )}
                {conversation.visitor.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="text-muted-foreground h-4 w-4" />
                    <a href={`mailto:${conversation.visitor.email}`} className="hover:text-primary truncate">{conversation.visitor.email}</a>
                  </div>
                )}
                {conversation.visitor.pageUrl && (
                  <div className="flex items-center gap-2 text-sm">
                    <Globe className="text-muted-foreground h-4 w-4" />
                    <span className="truncate">{conversation.visitor.pageUrl}</span>
                  </div>
                )}
                {conversation.visitor.userAgent && (
                  <div className="flex items-start gap-2 text-sm">
                    <Monitor className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
                    <span className="text-muted-foreground text-xs leading-relaxed">{conversation.visitor.userAgent}</span>
                  </div>
                )}
              </div>
            )}

            {conversation.lead && (
              <div>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Lead</h4>
                <div className="space-y-2">
                  {conversation.lead.name && (
                    <div className="flex items-center gap-2 text-sm">
                      <User className="text-muted-foreground h-4 w-4" />
                      <span>{conversation.lead.name}</span>
                    </div>
                  )}
                  {conversation.lead.email && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="text-muted-foreground h-4 w-4" />
                      <a href={`mailto:${conversation.lead.email}`} className="hover:text-primary truncate">{conversation.lead.email}</a>
                    </div>
                  )}
                  {conversation.lead.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="text-muted-foreground h-4 w-4" />
                      <span>{conversation.lead.phone}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {conversation.website && (
              <div>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Source</h4>
                <p className="text-sm">{conversation.website.name}</p>
                {conversation.website.url && <p className="text-muted-foreground truncate text-xs">{conversation.website.url}</p>}
              </div>
            )}

            {conversation.agent && (
              <div>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">AI Agent</h4>
                <p className="text-sm">{conversation.agent.name}</p>
              </div>
            )}

            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Timeline</h4>
              <p className="text-muted-foreground text-xs">Created: {new Date(conversation.createdAt).toLocaleString()}</p>
              {conversation.lastMessageAt && <p className="text-muted-foreground text-xs">Last activity: {new Date(conversation.lastMessageAt).toLocaleString()}</p>}
              {conversation.resolvedAt && <p className="text-muted-foreground text-xs">Resolved: {new Date(conversation.resolvedAt).toLocaleString()}</p>}
            </div>

            {conversation.visitorHistory?.length > 0 && (
              <div>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Previous Conversations</h4>
                <div className="space-y-1.5">
                  {conversation.visitorHistory.map((vc: any) => (
                    <p key={vc.id} className="hover:bg-muted/50 rounded-lg border border-border/50 px-3 py-1.5 text-xs">
                      <span className="font-medium">{new Date(vc.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
                      <span className="text-muted-foreground"> · {vc.messageCount} msg{vc.messageCount !== 1 ? "s" : ""}</span>
                      {vc.status && <span className="text-muted-foreground"> · {vc.status}</span>}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ConversationsPage({ user }: { user: AuthUser }) {
  const params = useParams<{ id: string }>();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusValue>("all");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading, error } = useQuery(getConversationsInbox, {
    search: debouncedSearch || undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
    pageSize: 50,
  });

  const { data: conversationDetail, refetch: refetchDetail } = useQuery(getConversationsInbox, {
    search: debouncedSearch || undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
    pageSize: 50,
  }, { enabled: false });

  const convs = data?.conversations || [];
  const selectedConv = params?.id ? convs.find((c: any) => c.id === params.id) : null;

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
        <h1 className="text-3xl font-bold tracking-tight lg:text-4xl">Inbox</h1>
        <p className="text-muted-foreground mt-2 text-base lg:text-lg">
          Manage conversations with your visitors
        </p>
      </div>

      <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden">
        <div className="flex h-[calc(100vh-280px)] min-h-[600px]">
          <div className="w-96 shrink-0 border-r border-border/50 flex flex-col">
            <div className="border-b border-border/50 p-4 space-y-3">
              <div className="relative">
                <Search className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
                <input
                  type="search"
                  placeholder="Search conversations..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="bg-muted w-full rounded-xl py-2 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div className="flex gap-1 overflow-x-auto">
                {STATUS_TABS.map(tab => {
                  const Icon = tab.icon;
                  const active = statusFilter === tab.value;
                  return (
                    <button
                      key={tab.value}
                      onClick={() => setStatusFilter(tab.value)}
                      className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                        active ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
                </div>
              ) : convs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 px-6">
                  <MessageSquare className="text-muted-foreground mb-3 h-12 w-12" />
                  <p className="text-muted-foreground text-sm text-center">
                    {search ? "No conversations match your search" : "No conversations yet"}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border/50">
                  {convs.map((conv: any) => {
                    const isActive = selectedConv?.id === conv.id;
                    return (
                      <Link
                        key={conv.id}
                        to={routes.ConversationDetailRoute.to.replace(":id", conv.id)} as any}
                        className={`flex items-start gap-3 px-5 py-4 transition-colors ${
                          isActive ? "bg-primary/5" : "hover:bg-muted/50"
                        }`}
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                          {(conv.leadName || "A").charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="truncate text-sm font-semibold">
                              {conv.leadName || conv.visitorName || "Anonymous"}
                            </p>
                            <span className="text-muted-foreground shrink-0 text-xs">
                              {conv.lastMessageAt
                                ? new Date(conv.lastMessageAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })
                                : new Date(conv.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                            </span>
                          </div>
                          <div className="text-muted-foreground mt-0.5 flex items-center gap-2">
                            {conv.leadEmail && <span className="truncate text-xs">{conv.leadEmail}</span>}
                            <StatusBadge status={conv.status} />
                          </div>
                          {conv.lastMessage && (
                            <p className="text-muted-foreground mt-1 line-clamp-1 text-xs">
                              {conv.lastMessage.role === "assistant" ? "AI: " : "User: "}
                              {conv.lastMessage.content}
                            </p>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="hidden flex-1 md:flex">
            {selectedConv ? (
              <ConversationPanel
                conversation={selectedConv}
                user={user}
                onClose={() => {}}
              />
            ) : (
              <div className="flex flex-1 items-center justify-center">
                <div className="text-center">
                  <MessageSquare className="text-muted-foreground mx-auto mb-4 h-16 w-16" />
                  <h2 className="text-xl font-semibold">Select a conversation</h2>
                  <p className="text-muted-foreground mt-2 text-sm">
                    Choose a conversation from the left to view details
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

