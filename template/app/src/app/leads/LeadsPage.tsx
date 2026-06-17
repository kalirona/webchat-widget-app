import { useState, useMemo, useEffect } from "react";
import { type AuthUser } from "wasp/auth";
import { useQuery, useAction } from "wasp/client/operations";
import { getLeads, updateLead, deleteLead } from "wasp/client/operations";
import {
  Users, Mail, Phone, Globe, MessageSquare, Search, Filter, Trash2,
  Loader2, AlertCircle, ChevronDown, Eye, Edit2, X, Check,
} from "lucide-react";
import { AppLayout } from "../layout/AppLayout";
import { LEAD_STATUS, LEAD_STATUS_OPTIONS, type LeadStatus } from "./constants";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "../../client/components/ui/dialog";
import { Button } from "../../client/components/ui/button";

export function LeadsPage({ user }: { user: AuthUser }) {
  const { data: leads, isLoading, error } = useQuery(getLeads);
  const updateLeadAction = useAction(updateLead);
  const deleteLeadAction = useAction(deleteLead);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "all">("all");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editStatus, setEditStatus] = useState<LeadStatus>("new");
  const [savingStatus, setSavingStatus] = useState(false);

  const filteredLeads = useMemo(() => {
    if (!leads) return [];
    return leads.filter((lead) => {
      const matchesSearch =
        !debouncedSearch ||
        (lead.name?.toLowerCase().includes(debouncedSearch.toLowerCase())) ||
        (lead.email?.toLowerCase().includes(debouncedSearch.toLowerCase())) ||
        (lead.phone?.toLowerCase().includes(debouncedSearch.toLowerCase()));
      const matchesStatus = statusFilter === "all" || lead.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [leads, debouncedSearch, statusFilter]);

  const statusCounts = useMemo(() => {
    if (!leads) return { all: 0, new: 0, contacted: 0, closed: 0 };
    return {
      all: leads.length,
      new: leads.filter((l) => l.status === "new").length,
      contacted: leads.filter((l) => l.status === "contacted").length,
      closed: leads.filter((l) => l.status === "closed").length,
    };
  }, [leads]);

  const handleStatusChange = async (id: string, status: LeadStatus) => {
    setSavingStatus(true);
    try {
      await updateLeadAction({ id, status });
      setEditingId(null);
    } catch {} finally {
      setSavingStatus(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteLeadAction({ id: deleteId });
      setDeleteId(null);
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : "Failed to delete lead");
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
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight lg:text-4xl">Leads</h1>
        <p className="text-muted-foreground mt-2 text-base lg:text-lg">
          Manage and track your captured leads
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, or phone..."
            className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-10 w-full rounded-xl border pl-10 pr-4 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 rounded-xl border border-border/50 bg-muted/30 p-1">
          <button
            onClick={() => setStatusFilter("all")}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              statusFilter === "all"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            All ({statusCounts.all})
          </button>
          {LEAD_STATUS_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setStatusFilter(value as LeadStatus)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                statusFilter === value
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {label} ({statusCounts[value as LeadStatus]})
            </button>
          ))}
        </div>
      </div>

      {/* Loading */}
      {isLoading ? (
        <div className="bg-card rounded-2xl border border-border/50 shadow-sm">
          <div className="divide-y divide-border/50">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="animate-pulse px-6 py-5">
                <div className="flex items-center gap-4">
                  <div className="bg-muted h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="bg-muted h-5 w-40 rounded-lg" />
                    <div className="bg-muted h-4 w-24 rounded-lg" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : !leads || leads.length === 0 ? (
        /* Empty State */
        <div className="flex flex-col items-center justify-center py-24">
          <div className="bg-primary/10 mb-6 flex h-20 w-20 items-center justify-center rounded-2xl">
            <Users className="text-primary h-10 w-10" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight">No leads yet</h2>
          <p className="text-muted-foreground mt-3 max-w-lg text-center text-base">
            When visitors interact with your AI agent and share their information, they will appear here as leads.
          </p>
        </div>
      ) : filteredLeads.length === 0 ? (
        /* No Results */
        <div className="flex flex-col items-center justify-center py-16">
          <Search className="text-muted-foreground mb-4 h-12 w-12" />
          <h2 className="text-xl font-bold">No leads found</h2>
          <p className="text-muted-foreground mt-2 text-sm">
            Try adjusting your search or filter criteria.
          </p>
        </div>
      ) : (
        /* Leads Table */
        <div className="bg-card rounded-2xl border border-border/50 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/50 text-left">
                  <th className="px-6 py-4 text-sm font-semibold">Lead</th>
                  <th className="px-6 py-4 text-sm font-semibold">Contact</th>
                  <th className="px-6 py-4 text-sm font-semibold">Phone</th>
                  <th className="px-6 py-4 text-sm font-semibold">Source</th>
                  <th className="px-6 py-4 text-sm font-semibold">Status</th>
                  <th className="px-6 py-4 text-sm font-semibold">Conversations</th>
                  <th className="px-6 py-4 text-sm font-semibold">Date</th>
                  <th className="px-6 py-4 text-sm font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {filteredLeads.map((lead) => {
                  const status = LEAD_STATUS[lead.status as LeadStatus] || LEAD_STATUS.new;
                  const isEditing = editingId === lead.id;
                  return (
                    <tr key={lead.id} className="hover:bg-muted/50 transition-colors">
                      {/* Name */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="flex h-10 w-10 items-center justify-center rounded-xl text-sm font-semibold"
                            style={{ backgroundColor: `${status.dot === "bg-blue-500" ? "#3b82f6" : status.dot === "bg-amber-500" ? "#f59e0b" : "#10b981"}15`, color: status.dot === "bg-blue-500" ? "#3b82f6" : status.dot === "bg-amber-500" ? "#f59e0b" : "#10b981" }}
                          >
                            {lead.name ? lead.name.charAt(0).toUpperCase() : "?"}
                          </div>
                          <span className="font-medium">{lead.name || "Anonymous"}</span>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="px-6 py-4">
                        {lead.email ? (
                          <span className="text-muted-foreground inline-flex items-center gap-1.5 text-sm">
                            <Mail className="h-3.5 w-3.5" />
                            {lead.email}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </td>

                      {/* Phone */}
                      <td className="px-6 py-4">
                        {lead.phone ? (
                          <span className="text-muted-foreground inline-flex items-center gap-1.5 text-sm">
                            <Phone className="h-3.5 w-3.5" />
                            {lead.phone}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </td>

                      {/* Source Website */}
                      <td className="px-6 py-4">
                        {lead.sourceWebsiteName ? (
                          <span className="text-muted-foreground inline-flex items-center gap-1.5 text-sm">
                            <Globe className="h-3.5 w-3.5" />
                            {lead.sourceWebsiteName}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4">
                        {isEditing ? (
                          <div className="flex items-center gap-1">
                            <select
                              value={editStatus}
                              onChange={(e) => setEditStatus(e.target.value as LeadStatus)}
                              className="border-input bg-background h-8 rounded-lg border px-2 text-xs focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-2"
                            >
                              {LEAD_STATUS_OPTIONS.map(({ value, label }) => (
                                <option key={value} value={value}>{label}</option>
                              ))}
                            </select>
                            <button
                              onClick={() => handleStatusChange(lead.id, editStatus)}
                              disabled={savingStatus}
                              className="text-emerald-600 hover:bg-emerald-500/10 rounded-lg p-1 transition-colors"
                            >
                              <Check className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="text-muted-foreground hover:bg-muted rounded-lg p-1 transition-colors"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => { setEditingId(lead.id); setEditStatus(lead.status as LeadStatus); }}
                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors hover:opacity-80 ${status.color}`}
                          >
                            <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
                            {status.label}
                          </button>
                        )}
                      </td>

                      {/* Conversations */}
                      <td className="px-6 py-4">
                        <span className="text-muted-foreground inline-flex items-center gap-1.5 text-sm">
                          <MessageSquare className="h-3.5 w-3.5" />
                          {lead.conversations.length}
                        </span>
                      </td>

                      {/* Date */}
                      <td className="text-muted-foreground px-6 py-4 text-sm">
                        {lead.createdAt.toLocaleDateString()}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1">
                          {lead.conversations.length > 0 && (
                            <a
                              href={`/app/conversations`}
                              className="hover:bg-muted inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium transition-colors"
                              title="View conversations"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </a>
                          )}
                          <button
                            onClick={() => setDeleteId(lead.id)}
                            className="hover:bg-destructive/10 hover:text-destructive inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Delete Dialog */}
      <Dialog open={!!deleteId} onOpenChange={() => { setDeleteId(null); setDeleteError(null); }}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Delete Lead</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this lead? Conversations will be preserved but unlinked from this lead.
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
