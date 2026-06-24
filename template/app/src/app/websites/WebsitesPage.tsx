import { useState } from "react";
import { type AuthUser } from "wasp/auth";
import { useQuery, useAction } from "wasp/client/operations";
import { getWebsites, deleteWebsite } from "wasp/client/operations";
import { Link, routes } from "wasp/client/router";
import {
  Globe, Plus, ExternalLink, Trash2, Loader2, Settings, Code2, Palette,
  AlertCircle, MessageSquare, Link2, Image, CheckCircle2,
} from "lucide-react";
import { AppLayout } from "../layout/AppLayout";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "../../client/components/ui/dialog";
import { Button } from "../../client/components/ui/button";
import { WEBSITE_STATUS, getDomainFromUrl } from "./constants";

export function WebsitesPage({ user }: { user: AuthUser }) {
  const { data: websites, isLoading, error } = useQuery(getWebsites);
  const deleteWebsiteAction = useAction(deleteWebsite);

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteWebsiteAction({ id: deleteId });
      setDeleteId(null);
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : "Failed to remove website");
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
          <h1 className="text-3xl font-bold tracking-tight lg:text-4xl">Websites</h1>
          <p className="text-muted-foreground mt-2 text-base lg:text-lg">
            Deploy your AI agents across your web properties
          </p>
        </div>
        <Link
          to={routes.NewWebsiteRoute.to}
          className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex shrink-0 items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30"
        >
          <Plus className="h-4 w-4" />
          Add Website
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
              <div className="bg-muted h-4 w-1/2 rounded-lg" />
            </div>
          ))}
        </div>
      ) : !websites || websites.length === 0 ? (
        /* Empty State */
        <div className="flex flex-col items-center justify-center py-24">
          <div className="bg-primary/10 mb-6 flex h-20 w-20 items-center justify-center rounded-2xl">
            <Globe className="text-primary h-10 w-10" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight">No websites yet</h2>
          <p className="text-muted-foreground mt-3 mb-8 max-w-lg text-center text-base">
            Add a website to deploy your AI agent and start engaging with visitors in real-time.
          </p>
          <Link
            to={routes.NewWebsiteRoute.to}
            className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold transition-all shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30"
          >
            <Plus className="h-5 w-5" />
            Add Your First Website
          </Link>
        </div>
      ) : (
        /* Website Cards */
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {websites.map((website) => {
            const status = WEBSITE_STATUS[website.status as keyof typeof WEBSITE_STATUS] || WEBSITE_STATUS.inactive;
            return (
              <div
                key={website.id}
                className="bg-card hover:border-primary/30 group rounded-2xl border border-border/50 p-6 shadow-sm transition-all hover:shadow-md"
              >
                {/* Header: Logo + Name + Status */}
                <div className="mb-4 flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {website.logoUrl ? (
                      <img
                        src={website.logoUrl}
                        alt={website.name}
                        className="h-12 w-12 rounded-xl object-contain ring-1 ring-border/50"
                      />
                    ) : (
                      <div
                        className="flex h-12 w-12 items-center justify-center rounded-xl"
                        style={{ backgroundColor: `${website.widgetColor}15` }}
                      >
                        <Globe className="h-6 w-6" style={{ color: website.widgetColor }} />
                      </div>
                    )}
                    <div>
                      <h3 className="font-semibold group-hover:text-primary transition-colors">
                        {website.name}
                      </h3>
                      <span className={`mt-1.5 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${status.color}`}>
                        <span className={`mr-1.5 h-1.5 w-1.5 rounded-full ${status.dot}`} />
                        {status.label}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Domain */}
                <a
                  href={website.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-primary mb-4 inline-flex items-center gap-1.5 text-sm transition-colors"
                >
                  <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{getDomainFromUrl(website.url)}</span>
                </a>

                {/* Connected Agent */}
                <div className="mb-4 flex items-center gap-2">
                  {website.agentName ? (
                    <div className="bg-primary/10 text-primary inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium">
                      <Link2 className="h-3 w-3" />
                      {website.agentName}
                    </div>
                  ) : (
                    <span className="bg-muted text-muted-foreground inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium">
                      <Link2 className="h-3 w-3" />
                      No agent linked
                    </span>
                  )}
                </div>

                {/* Meta Info */}
                <div className="text-muted-foreground mb-5 flex items-center gap-4 text-xs">
                  <span className="inline-flex items-center gap-1">
                    <Palette className="h-3.5 w-3.5" />
                    <span className="inline-block h-3 w-3 rounded-full ring-1 ring-border" style={{ backgroundColor: website.widgetColor }} />
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <MessageSquare className="h-3.5 w-3.5" />
                    {website.widgetPosition === "right" ? "Bottom right" : "Bottom left"}
                  </span>
                </div>

                {/* Actions */}
                <div className="border-t border-border/50 pt-4 flex items-center gap-1">
                  <Link
                    to={routes.EditWebsiteRoute.to.replace(":id", website.id)} as any}
                    className="hover:bg-muted inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
                  >
                    <Settings className="h-3.5 w-3.5" />
                    Configure
                  </Link>
                  <Link
                    to={routes.EditWebsiteRoute.to.replace(":id", website.id)} as any}
                    className="hover:bg-muted inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
                  >
                    <Code2 className="h-3.5 w-3.5" />
                    Embed
                  </Link>
                  <button
                    onClick={() => setDeleteId(website.id)}
                    className="hover:bg-destructive/10 hover:text-destructive inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Remove
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Dialog */}
      <Dialog open={!!deleteId} onOpenChange={() => { setDeleteId(null); setDeleteError(null); }}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Remove Website</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove this website? Conversations history will be preserved, but the widget will stop working on this domain.
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
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

