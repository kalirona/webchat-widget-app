import { useParams } from "react-router";
import { useState, useRef, useEffect } from "react";
import { type AuthUser } from "wasp/auth";
import { useQuery } from "wasp/client/operations";
import { getAgent, getAgentStats } from "wasp/client/operations";
import { Link, routes } from "wasp/client/router";
import {
  Bot, ArrowLeft, Loader2, MessageSquare, Users, MessageCircle,
  Pencil, Play, Pause, Globe, Send, Sparkles,
} from "lucide-react";
import { AppLayout } from "../layout/AppLayout";
import { Button } from "../../client/components/ui/button";
import { AGENT_STATUS, getModelLabel, type AgentStatus } from "./constants";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

export function AgentDetailPage({ user }: { user: AuthUser }) {
  const { id } = useParams<{ id: string }>();
  const { data: agent, isLoading: agentLoading } = useQuery(getAgent, { id: id! }) as Record<string, any>;
  const { data: stats } = useQuery(getAgentStats, { id: id! }) as Record<string, any>;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Initialize chat with agent's welcome message
  useEffect(() => {
    if (agent?.welcomeMessage && messages.length === 0) {
      setMessages([
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: agent.welcomeMessage,
        },
      ]);
    }
  }, [agent?.welcomeMessage]);

  // Auto-scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || sending) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: input.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setSending(true);

    // Simulate AI response (will be replaced with real AI in future)
    setTimeout(() => {
      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: `Thanks for your message! This is a simulated response. In production, your agent would use the ${getModelLabel(agent?.model || "gpt-4o")} model with temperature ${agent?.temperature || 0.7} to generate a response based on the system prompt.`,
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setSending(false);
    }, 1000);
  };

  if (agentLoading) {
    return (
      <AppLayout user={user}>
        <div className="flex h-full items-center justify-center">
          <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
        </div>
      </AppLayout>
    );
  }

  if (!agent) {
    return (
      <AppLayout user={user}>
        <div className="flex flex-col items-center justify-center py-24">
          <div className="bg-muted/50 mb-6 flex h-20 w-20 items-center justify-center rounded-2xl">
            <Bot className="text-muted-foreground h-10 w-10" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Agent Not Found</h2>
          <p className="text-muted-foreground mt-3 mb-6 text-base">
            The agent you're looking for doesn't exist or has been deleted.
          </p>
          <Link
            to={routes.AgentsRoute.to}
            className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Agents
          </Link>
        </div>
      </AppLayout>
    );
  }

  const statusInfo = AGENT_STATUS[agent.status as AgentStatus] || AGENT_STATUS.draft;

  return (
    <AppLayout user={user}>
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            to={routes.AgentsRoute.to}
            className="text-muted-foreground hover:text-foreground mb-2 inline-flex items-center gap-1.5 text-sm font-medium transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Agents
          </Link>
          <div className="flex items-center gap-4">
            <div className="bg-primary/10 text-primary flex h-14 w-14 items-center justify-center rounded-2xl">
              <Bot className="h-7 w-7" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold tracking-tight lg:text-4xl">{agent.name}</h1>
                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${statusInfo.color}`}>
                  {agent.status === "active" && <Play className="h-3 w-3" />}
                  {agent.status === "paused" && <Pause className="h-3 w-3" />}
                  {statusInfo.label}
                </span>
              </div>
              {agent.description && (
                <p className="text-muted-foreground mt-1 text-base">{agent.description}</p>
              )}
            </div>
          </div>
        </div>
        <Link
          to={routes.EditAgentRoute.to.replace(":id", agent.id) as any}
          className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all shadow-lg shadow-primary/25"
        >
          <Pencil className="h-4 w-4" />
          Edit Agent
        </Link>
      </div>

      {/* Stats */}
      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="bg-card rounded-2xl border border-border/50 p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="bg-blue-500/10 flex h-10 w-10 items-center justify-center rounded-xl">
              <MessageSquare className="text-blue-500 h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats?.totalConversations ?? agent.conversationCount ?? 0}</p>
              <p className="text-muted-foreground text-xs">Conversations</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-2xl border border-border/50 p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-500/10 flex h-10 w-10 items-center justify-center rounded-xl">
              <MessageCircle className="text-emerald-500 h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats?.totalMessages ?? 0}</p>
              <p className="text-muted-foreground text-xs">Messages</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-2xl border border-border/50 p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="bg-violet-500/10 flex h-10 w-10 items-center justify-center rounded-xl">
              <Users className="text-violet-500 h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats?.totalLeads ?? 0}</p>
              <p className="text-muted-foreground text-xs">Leads</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-2xl border border-border/50 p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="bg-amber-500/10 flex h-10 w-10 items-center justify-center rounded-xl">
              <Globe className="text-amber-500 h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{agent.websiteCount}</p>
              <p className="text-muted-foreground text-xs">Websites</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Configuration Panel */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card rounded-2xl border border-border/50 p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-5">Configuration</h2>
            <div className="space-y-4">
              <div>
                <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider">Model</p>
                <p className="text-sm font-medium mt-1">{getModelLabel(agent.model)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider">Temperature</p>
                <p className="text-sm font-medium mt-1">{agent.temperature.toFixed(1)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider">Status</p>
                <p className="text-sm font-medium mt-1 capitalize">{agent.status}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider">Created</p>
                <p className="text-sm font-medium mt-1">{new Date(agent.createdAt).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider">Last Updated</p>
                <p className="text-sm font-medium mt-1">{new Date(agent.updatedAt).toLocaleDateString()}</p>
              </div>
            </div>
          </div>

          {/* System Prompt */}
          <div className="bg-card rounded-2xl border border-border/50 p-6 shadow-sm">
            <h3 className="text-sm font-semibold mb-3">System Prompt</h3>
            <div className="bg-muted/50 max-h-48 overflow-y-auto rounded-xl p-4">
              <p className="text-muted-foreground whitespace-pre-wrap text-sm">{agent.systemPrompt}</p>
            </div>
          </div>
        </div>

        {/* Test Chat Panel */}
        <div className="lg:col-span-3">
          <div className="bg-card rounded-2xl border border-border/50 shadow-sm flex flex-col h-[600px]">
            {/* Chat Header */}
            <div className="border-border/50 flex items-center gap-3 border-b px-6 py-4">
              <div className="bg-primary/10 text-primary flex h-10 w-10 items-center justify-center rounded-xl">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold">Test Chat</h3>
                <p className="text-muted-foreground text-xs">Simulated responses for testing</p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <div className="space-y-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))}
                {sending && (
                  <div className="flex justify-start">
                    <div className="bg-muted rounded-2xl px-4 py-3">
                      <div className="flex items-center gap-1">
                        <span className="bg-muted-foreground h-2 w-2 animate-bounce rounded-full" style={{ animationDelay: "0ms" }} />
                        <span className="bg-muted-foreground h-2 w-2 animate-bounce rounded-full" style={{ animationDelay: "150ms" }} />
                        <span className="bg-muted-foreground h-2 w-2 animate-bounce rounded-full" style={{ animationDelay: "300ms" }} />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
            </div>

            {/* Input */}
            <div className="border-border/50 border-t px-6 py-4">
              <form onSubmit={handleSend} className="flex gap-3">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type a message to test..."
                  disabled={sending}
                  className="border-input bg-background placeholder:text-muted-foreground focus-visible:ring-ring flex-1 rounded-xl border px-4 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50"
                />
                <Button
                  type="submit"
                  disabled={sending || !input.trim()}
                  className="rounded-xl px-4"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}








