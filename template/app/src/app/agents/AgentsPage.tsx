import { useState, useCallback } from "react";
import { type AuthUser } from "wasp/auth";
import { useQuery } from "wasp/client/operations";
import { getAgents, deleteAgent } from "wasp/client/operations";
import { Link, routes } from "wasp/client/router";
import {
  Bot, Plus, Pencil, Trash2, Play, Pause, Loader2,
  Search, ChevronLeft, ChevronRight, Eye,
} from "lucide-react";
import { useDebounce } from "../../client/hooks/useDebounce";
import { AppLayout } from "../layout/AppLayout";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../client/components/ui/dialog";
import { Button } from "../../client/components/ui/button";

const PAGE_SIZE = 9;

export function AgentsPage({ user }: { user: AuthUser }) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const debouncedSearch = useDebounce(search, 300);

  const queryKey = {
    search: debouncedSearch || undefined,
    skip: page * PAGE_SIZE,
    pageSize: PAGE_SIZE,
  };

  const { data, isLoading, error } = useQuery(getAgents, queryKey);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await deleteAgent({ id: deleteId });
      if (data && data.agents.length === 1 && page > 0) {
        setPage((p) => p - 1);
      }
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  const handleSearchChange = useCallback((val: string) => {
    setSearch(val);
    setPage(0);
  }, []);

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

  const agents = data?.agents ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 0;

  return (
    <AppLayout user={user}>
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight lg:text-4xl">AI Agents</h1>
          <p className="text-muted-foreground mt-2 text-base lg:text-lg">
            Create and manage your AI agents
          </p>
        </div>
        <Link
          to={routes.NewAgentRoute.to}
          className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex shrink-0 items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30"
        >
          <Plus className="h-4 w-4" />
          New Agent
        </Link>
      </div>

      {/* Search */}
      {total > 0 && (
        <div className="mb-6">
          <div className="relative max-w-sm">
            <Search className="text-muted-foreground absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search agents..."
              className="border-border/50 bg-background placeholder:text-muted-foreground focus-visible:ring-ring h-11 w-full rounded-xl border pl-11 pr-4 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
            />
          </div>
        </div>
      )}

      {/* Loading */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-card animate-pulse rounded-2xl border border-border/50 p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-3">
                <div className="bg-muted h-12 w-12 rounded-xl" />
                <div className="space-y-2">
                  <div className="bg-muted h-5 w-32 rounded-lg" />
                  <div className="bg-muted h-4 w-20 rounded-lg" />
                </div>
              </div>
              <div className="bg-muted mb-2 h-4 w-full rounded-lg" />
              <div className="bg-muted mb-4 h-4 w-3/4 rounded-lg" />
              <div className="bg-muted h-4 w-1/2 rounded-lg" />
            </div>
          ))}
        </div>
      ) : agents.length === 0 ? (
        /* Empty State */
        <div className="flex flex-col items-center justify-center py-24">
          <div className="bg-primary/10 mb-6 flex h-20 w-20 items-center justify-center rounded-2xl">
            <Bot className="text-primary h-10 w-10" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight">
            {search ? "No agents match your search" : "No agents yet"}
          </h2>
          <p className="text-muted-foreground mt-3 mb-8 max-w-lg text-center text-base">
            {search
              ? "Try a different search term or create a new agent."
              : "Create your first AI agent to start capturing leads and engaging with visitors on your website."
            }
          </p>
          {!search && (
            <Link
              to={routes.NewAgentRoute.to}
              className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold transition-all shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30"
            >
              <Plus className="h-5 w-5" />
              Create Agent
            </Link>
          )}
        </div>
      ) : (
        <>
          {/* Agent Cards */}
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {agents.map((agent) => (
              <Link
                key={agent.id}
                to={routes.AgentDetailRoute.to.replace(":id", agent.id)} as any}
                className="bg-card hover:border-primary/30 group rounded-2xl border border-border/50 p-6 shadow-sm transition-all hover:shadow-md"
              >
                <div className="mb-4 flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/10 text-primary flex h-12 w-12 items-center justify-center rounded-xl transition-colors group-hover:bg-primary/20">
                      <Bot className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="font-semibold group-hover:text-primary transition-colors">{agent.name}</h3>
                      <span
                        className={`mt-1.5 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          agent.status === "active"
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : agent.status === "paused"
                              ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                              : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {agent.status === "active" ? (
                          <Play className="h-3 w-3" />
                        ) : agent.status === "paused" ? (
                          <Pause className="h-3 w-3" />
                        ) : null}
                        {agent.status.charAt(0).toUpperCase() + agent.status.slice(1)}
                      </span>
                    </div>
                  </div>
                </div>
                {agent.description && (
                  <p className="text-muted-foreground mb-4 text-sm line-clamp-2">
                    {agent.description}
                  </p>
                )}
                <div className="text-muted-foreground mb-1 text-xs">
                  Model: {agent.model}
                </div>
                <div className="text-muted-foreground mb-5 text-xs">
                  {agent.websiteCount} website{agent.websiteCount !== 1 ? "s" : ""} ·{" "}
                  {agent.conversationCount} conversation{agent.conversationCount !== 1 ? "s" : ""} · Created{" "}
                  {new Date(agent.createdAt).toLocaleDateString()}
                </div>
                <div className="flex items-center gap-1" onClick={(e) => e.preventDefault()}>
                  <Link
                    to={routes.AgentDetailRoute.to.replace(":id", agent.id)} as any}
                    className="hover:bg-muted inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    View
                  </Link>
                  <Link
                    to={routes.EditAgentRoute.to.replace(":id", agent.id)} as any}
                    className="hover:bg-muted inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </Link>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      setDeleteId(agent.id);
                    }}
                    className="hover:bg-destructive/10 hover:text-destructive inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </button>
                </div>
              </Link>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="border-border/50 hover:bg-muted inline-flex items-center gap-1 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </button>
              <div className="flex items-center gap-1 px-4">
                {Array.from({ length: totalPages }, (_, i) => (
                  <button
                    key={i}
                    onClick={() => setPage(i)}
                    className={`flex h-10 w-10 items-center justify-center rounded-xl text-sm font-medium transition-colors ${
                      i === page
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="border-border/50 hover:bg-muted inline-flex items-center gap-1 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </>
      )}

      {/* Delete Dialog */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Delete Agent</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this agent? This action cannot be undone.
              All associated conversations will be preserved but unlinked.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)} className="rounded-xl">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
              className="rounded-xl"
            >
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

