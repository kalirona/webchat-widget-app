import { useState } from "react";
import { type AuthUser } from "wasp/auth";
import { useQuery, useAction } from "wasp/client/operations";
import { getKnowledgeBases, deleteKnowledgeBase } from "wasp/client/operations";
import { Link, routes } from "wasp/client/router";
import { BookOpen, Plus, Trash2, Loader2, FileText, SplitSquareVertical, AlertCircle } from "lucide-react";
import { AppLayout } from "../layout/AppLayout";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "../../client/components/ui/dialog";
import { Button } from "../../client/components/ui/button";

export function KnowledgeBasesPage({ user }: { user: AuthUser }) {
  const { data: knowledgeBases, isLoading, error } = useQuery(getKnowledgeBases);
  const deleteKnowledgeBaseAction = useAction(deleteKnowledgeBase);

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteKnowledgeBaseAction({ id: deleteId });
      setDeleteId(null);
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : "Failed to delete knowledge base");
    } finally {
      setDeleting(false);
    }
  };

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
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight lg:text-4xl">Knowledge Bases</h1>
          <p className="text-muted-foreground mt-2 text-base lg:text-lg">
            Central repository for documents and content used by your AI agents
          </p>
        </div>
        <Link
          to={routes.NewKnowledgeBaseRoute.to}
          className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex shrink-0 items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30"
        >
          <Plus className="h-4 w-4" />
          New Knowledge Base
        </Link>
      </div>

      {/* Loading */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-card animate-pulse rounded-2xl border border-border/50 p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-3">
                <div className="bg-muted h-12 w-12 rounded-xl" />
                <div className="space-y-2">
                  <div className="bg-muted h-5 w-40 rounded-lg" />
                  <div className="bg-muted h-4 w-24 rounded-lg" />
                </div>
              </div>
              <div className="bg-muted mb-2 h-4 w-full rounded-lg" />
              <div className="bg-muted h-4 w-3/4 rounded-lg" />
            </div>
          ))}
        </div>
      ) : !knowledgeBases || knowledgeBases.length === 0 ? (
        /* Empty State */
        <div className="flex flex-col items-center justify-center py-24">
          <div className="bg-primary/10 mb-6 flex h-20 w-20 items-center justify-center rounded-2xl">
            <BookOpen className="text-primary h-10 w-10" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight">No knowledge bases yet</h2>
          <p className="text-muted-foreground mt-3 mb-8 max-w-lg text-center text-base">
            Create a knowledge base to upload documents and web content. Your AI agents will use this information to provide better responses.
          </p>
          <Link
            to={routes.NewKnowledgeBaseRoute.to}
            className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold transition-all shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30"
          >
            <Plus className="h-5 w-5" />
            Create Knowledge Base
          </Link>
        </div>
      ) : (
        /* Knowledge Base Cards */
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {knowledgeBases.map((kb) => (
            <Link
              key={kb.id}
              to={routes.KnowledgeBaseDetailRoute.to.replace(":id", kb.id) as any}
              className="bg-card hover:border-primary/30 group rounded-2xl border border-border/50 p-6 shadow-sm transition-all hover:shadow-md"
            >
              <div className="mb-4 flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 text-primary flex h-12 w-12 items-center justify-center rounded-xl transition-colors group-hover:bg-primary/20">
                    <BookOpen className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold group-hover:text-primary transition-colors">{kb.name}</h3>
                  </div>
                </div>
              </div>
              {kb.description && (
                <p className="text-muted-foreground mb-4 text-sm line-clamp-2">
                  {kb.description}
                </p>
              )}
              <div className="text-muted-foreground mb-5 flex items-center gap-4 text-xs">
                <span className="inline-flex items-center gap-1">
                  <FileText className="h-3.5 w-3.5" />
                  {kb.documentCount} document{kb.documentCount !== 1 ? "s" : ""}
                </span>
                <span>Created {new Date(kb.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center gap-2" onClick={(e) => e.preventDefault()}>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    setDeleteId(kb.id);
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
      )}

      {/* Delete Dialog */}
      <Dialog open={!!deleteId} onOpenChange={() => { setDeleteId(null); setDeleteError(null); }}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Delete Knowledge Base</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this knowledge base? All documents, chunks, and agent links will be permanently removed. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {deleteError && (
            <div className="bg-destructive/10 text-destructive flex items-center gap-2 rounded-xl px-4 py-3 text-sm">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {deleteError}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDeleteId(null); setDeleteError(null); }} className="rounded-xl">
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting} className="rounded-xl">
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}


