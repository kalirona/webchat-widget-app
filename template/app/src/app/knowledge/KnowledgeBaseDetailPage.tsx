import { useParams } from "react-router";
import { useState, useCallback, useMemo } from "react";
import { type AuthUser } from "wasp/auth";
import { useQuery, useAction } from "wasp/client/operations";
import {
  getKnowledgeBase,
  getAgents,
  uploadKnowledgeDocument,
  crawlUrl,
  deleteKnowledgeDocument,
  linkAgentToKnowledgeBase,
  unlinkAgentFromKnowledgeBase,
  createCustomTextEntry,
} from "wasp/client/operations";
import { Link, useParams, routes } from "wasp/client/router";
import {
  BookOpen, ArrowLeft, Loader2, Upload, Globe, Trash2, FileText,
  Link2, Unlink, CheckCircle2, AlertCircle, Clock, Search,
  Plus, SplitSquareVertical, X, Type,
} from "lucide-react";
import { AppLayout } from "../layout/AppLayout";
import { Button } from "../../client/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "../../client/components/ui/dialog";
import {
  getDocumentStatusInfo,
  getSourceTypeLabel,
  formatChunkCount,
  customTextEntrySchema,
  formatKnowledgeBaseError,
} from "./constants";

export function KnowledgeBaseDetailPage({ user }: { user: AuthUser }) {
  const { id } = useParams<{ id: string }>();
  const { data: kb, isLoading: kbLoading, refetch: refetchKb } = useQuery(getKnowledgeBase, { id: id! });
  const { data: agents } = useQuery(getAgents, { skip: 0, pageSize: 100 });

  const uploadAction = useAction(uploadKnowledgeDocument);
  const crawlAction = useAction(crawlUrl);
  const deleteDocAction = useAction(deleteKnowledgeDocument);
  const linkAgentAction = useAction(linkAgentToKnowledgeBase);
  const unlinkAgentAction = useAction(unlinkAgentFromKnowledgeBase);
  const createTextEntryAction = useAction(createCustomTextEntry);

  // File upload state
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Crawl state
  const [crawlUrl_, setCrawlUrl] = useState("");
  const [isSitemap, setIsSitemap] = useState(false);
  const [crawling, setCrawling] = useState(false);
  const [crawlError, setCrawlError] = useState<string | null>(null);

  // Custom text entry state
  const [showTextEntry, setShowTextEntry] = useState(false);
  const [textTitle, setTextTitle] = useState("");
  const [textContent, setTextContent] = useState("");
  const [creatingText, setCreatingText] = useState(false);
  const [textError, setTextError] = useState<string | null>(null);
  const [textFieldErrors, setTextFieldErrors] = useState<Record<string, string>>({});

  // Agent linking state
  const [linkingAgent, setLinkingAgent] = useState<string | null>(null);

  // Document delete state
  const [deleteDocId, setDeleteDocId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");

  // Refresh data after operations
  const refreshData = useCallback(() => {
    refetchKb();
  }, [refetchKb]);

  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id) return;

    setUploading(true);
    setUploadError(null);

    try {
      const buffer = await file.arrayBuffer();
      const base64 = btoa(
        new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
      );

      await uploadAction({
        knowledgeBaseId: id,
        fileName: file.name,
        fileData: base64,
      });

      refreshData();
      e.target.value = "";
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  // Handle URL crawl
  const handleCrawl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!crawlUrl_.trim() || !id) return;

    setCrawling(true);
    setCrawlError(null);

    try {
      await crawlAction({
        knowledgeBaseId: id,
        url: crawlUrl_.trim(),
        isSitemap,
      });

      setCrawlUrl("");
      setIsSitemap(false);
      refreshData();
    } catch (err: unknown) {
      setCrawlError(err instanceof Error ? err.message : "Crawl failed");
    } finally {
      setCrawling(false);
    }
  };

  // Handle custom text entry
  const handleCreateTextEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    setTextError(null);
    setTextFieldErrors({});

    const formData = {
      title: textTitle.trim(),
      content: textContent,
    };

    const validation = customTextEntrySchema.safeParse(formData);
    if (!validation.success) {
      setTextError(formatKnowledgeBaseError(validation.error));
      const errors: Record<string, string> = {};
      validation.error.issues.forEach((err) => {
        const field = err.path[0];
        if (typeof field === "string") {
          errors[field] = err.message;
        }
      });
      setTextFieldErrors(errors);
      return;
    }

    setCreatingText(true);
    try {
      await createTextEntryAction({
        knowledgeBaseId: id!,
        ...validation.data,
      });

      setTextTitle("");
      setTextContent("");
      setShowTextEntry(false);
      refreshData();
    } catch (err: unknown) {
      setTextError(err instanceof Error ? err.message : "Failed to create text entry");
    } finally {
      setCreatingText(false);
    }
  };

  // Handle agent link
  const handleLinkAgent = async (agentId: string) => {
    if (!id) return;
    setLinkingAgent(agentId);
    try {
      await linkAgentAction({ agentId, knowledgeBaseId: id });
      refreshData();
    } catch (err: unknown) {
      console.error("Failed to link agent:", err);
    } finally {
      setLinkingAgent(null);
    }
  };

  // Handle agent unlink
  const handleUnlinkAgent = async (agentId: string) => {
    if (!id) return;
    setLinkingAgent(agentId);
    try {
      await unlinkAgentAction({ agentId, knowledgeBaseId: id });
      refreshData();
    } catch (err: unknown) {
      console.error("Failed to unlink agent:", err);
    } finally {
      setLinkingAgent(null);
    }
  };

  // Handle document delete
  const handleDeleteDoc = async () => {
    if (!deleteDocId) return;
    setDeleting(true);
    try {
      await deleteDocAction({ id: deleteDocId });
      setDeleteDocId(null);
      refreshData();
    } catch (err: unknown) {
      console.error("Failed to delete document:", err);
    } finally {
      setDeleting(false);
    }
  };

  if (kbLoading) {
    return (
      <AppLayout user={user}>
        <div className="flex h-full items-center justify-center">
          <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
        </div>
      </AppLayout>
    );
  }

  if (!kb) {
    return (
      <AppLayout user={user}>
        <div className="flex flex-col items-center justify-center py-24">
          <div className="bg-muted/50 mb-6 flex h-20 w-20 items-center justify-center rounded-2xl">
            <BookOpen className="text-muted-foreground h-10 w-10" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Knowledge Base Not Found</h2>
          <p className="text-muted-foreground mt-3 mb-6 text-base">
            The knowledge base you're looking for doesn't exist or has been deleted.
          </p>
          <Link
            to={routes.KnowledgeBasesRoute.to}
            className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Knowledge Bases
          </Link>
        </div>
      </AppLayout>
    );
  }

  // Filter documents by search query
  const filteredDocuments = useMemo(() =>
    kb.documents.filter((doc) =>
      searchQuery ? doc.title.toLowerCase().includes(searchQuery.toLowerCase()) : true
    ), [kb.documents, searchQuery]);

  // Calculate stats
  const stats = useMemo(() => ({
    totalChunks: kb.documents.reduce((sum, doc) => sum + doc.chunkCount, 0),
    readyDocs: kb.documents.filter((d) => d.status === "ready").length,
    processingDocs: kb.documents.filter((d) => d.status === "processing").length,
    errorDocs: kb.documents.filter((d) => d.status === "error").length,
  }), [kb.documents]);

  const linkedAgentIds = useMemo(() => kb.agents.map((a) => a.agent.id), [kb.agents]);
  const availableAgents = useMemo(() => agents?.agents.filter((a) => !linkedAgentIds.includes(a.id)) || [], [agents, linkedAgentIds]);

  return (
    <AppLayout user={user}>
      {/* Header */}
      <div className="mb-8">
        <Link
          to={routes.KnowledgeBasesRoute.to}
          className="text-muted-foreground hover:text-foreground mb-4 inline-flex items-center gap-1.5 text-sm font-medium transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Knowledge Bases
        </Link>
        <div className="flex items-center gap-4">
          <div className="bg-primary/10 text-primary flex h-14 w-14 items-center justify-center rounded-2xl">
            <BookOpen className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight lg:text-4xl">{kb.name}</h1>
            {kb.description && (
              <p className="text-muted-foreground mt-1 text-base">{kb.description}</p>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="bg-card rounded-2xl border border-border/50 p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="bg-blue-500/10 flex h-10 w-10 items-center justify-center rounded-xl">
              <FileText className="text-blue-500 h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{kb.documents.length}</p>
              <p className="text-muted-foreground text-xs">Documents</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-2xl border border-border/50 p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-500/10 flex h-10 w-10 items-center justify-center rounded-xl">
              <SplitSquareVertical className="text-emerald-500 h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.totalChunks}</p>
              <p className="text-muted-foreground text-xs">Chunks</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-2xl border border-border/50 p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="bg-violet-500/10 flex h-10 w-10 items-center justify-center rounded-xl">
              <Link2 className="text-violet-500 h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{kb.agents.length}</p>
              <p className="text-muted-foreground text-xs">Linked Agents</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-2xl border border-border/50 p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="bg-amber-500/10 flex h-10 w-10 items-center justify-center rounded-xl">
              <CheckCircle2 className="text-amber-500 h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.readyDocs}</p>
              <p className="text-muted-foreground text-xs">Ready</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Documents List - Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Add Content Buttons */}
          <div className="bg-card rounded-2xl border border-border/50 p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-4">Add Content</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {/* File Upload */}
              <label className="hover:bg-muted/50 cursor-pointer rounded-xl border border-border/50 p-4 text-center transition-all hover:shadow-sm">
                <input
                  type="file"
                  accept=".pdf,.docx,.txt"
                  onChange={handleFileUpload}
                  disabled={uploading}
                  className="hidden"
                />
                {uploading ? (
                  <Loader2 className="text-primary mx-auto mb-2 h-8 w-8 animate-spin" />
                ) : (
                  <Upload className="text-primary mx-auto mb-2 h-8 w-8" />
                )}
                <p className="text-sm font-medium">
                  {uploading ? "Uploading..." : "Upload File"}
                </p>
                <p className="text-muted-foreground mt-1 text-xs">PDF, DOCX, TXT</p>
              </label>

              {/* URL Crawl */}
              <button
                type="button"
                onClick={() => document.getElementById("crawl-url-input")?.focus()}
                className="hover:bg-muted/50 rounded-xl border border-border/50 p-4 text-center transition-all hover:shadow-sm"
              >
                <Globe className="text-emerald-500 mx-auto mb-2 h-8 w-8" />
                <p className="text-sm font-medium">Crawl URL</p>
                <p className="text-muted-foreground mt-1 text-xs">Web pages & sitemaps</p>
              </button>

              {/* Custom Text */}
              <button
                type="button"
                onClick={() => setShowTextEntry(true)}
                className="hover:bg-muted/50 rounded-xl border border-border/50 p-4 text-center transition-all hover:shadow-sm"
              >
                <Type className="text-violet-500 mx-auto mb-2 h-8 w-8" />
                <p className="text-sm font-medium">Custom Text</p>
                <p className="text-muted-foreground mt-1 text-xs">Paste or write content</p>
              </button>
            </div>

            {uploadError && (
              <div className="bg-destructive/10 text-destructive mt-4 flex items-center gap-2 rounded-xl px-4 py-3 text-sm">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {uploadError}
              </div>
            )}
          </div>

          {/* URL Crawl Form */}
          <div className="bg-card rounded-2xl border border-border/50 p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-4">Crawl URL</h2>
            <form onSubmit={handleCrawl} className="space-y-4">
              <div>
                <input
                  id="crawl-url-input"
                  type="url"
                  value={crawlUrl_}
                  onChange={(e) => setCrawlUrl(e.target.value)}
                  placeholder="https://example.com/docs"
                  className="border-input bg-background placeholder:text-muted-foreground focus-visible:ring-ring h-11 w-full rounded-xl border px-4 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                />
              </div>
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={isSitemap}
                    onChange={(e) => setIsSitemap(e.target.checked)}
                    className="accent-primary h-4 w-4 rounded"
                  />
                  This is a sitemap
                </label>
                <Button
                  type="submit"
                  disabled={crawling || !crawlUrl_.trim()}
                  className="rounded-xl"
                >
                  {crawling ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Crawling...
                    </>
                  ) : (
                    <>
                      <Globe className="mr-2 h-4 w-4" />
                      Crawl
                    </>
                  )}
                </Button>
              </div>
              {crawlError && (
                <div className="bg-destructive/10 text-destructive flex items-center gap-2 rounded-xl px-4 py-3 text-sm">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  {crawlError}
                </div>
              )}
            </form>
          </div>

          {/* Documents List */}
          <div className="bg-card rounded-2xl border border-border/50 shadow-sm">
            <div className="border-border/50 border-b px-6 py-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Documents</h2>
                <span className="text-muted-foreground text-sm">
                  {filteredDocuments.length} of {kb.documents.length}
                </span>
              </div>
              {kb.documents.length > 0 && (
                <div className="relative mt-3">
                  <Search className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search documents..."
                    className="border-input bg-background placeholder:text-muted-foreground focus-visible:ring-ring h-10 w-full rounded-xl border pl-10 pr-4 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                  />
                </div>
              )}
            </div>

            {filteredDocuments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="bg-muted/50 mb-4 flex h-14 w-14 items-center justify-center rounded-xl">
                  <FileText className="text-muted-foreground h-7 w-7" />
                </div>
                <p className="text-muted-foreground text-center text-sm">
                  {searchQuery ? "No documents match your search" : "No documents yet. Add content using the options above."}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {filteredDocuments.map((doc) => {
                  const statusInfo = getDocumentStatusInfo(doc.status);
                  return (
                    <div key={doc.id} className="flex items-center justify-between px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
                          <FileText className="text-muted-foreground h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{doc.title}</p>
                          <div className="text-muted-foreground mt-1 flex items-center gap-3 text-xs">
                            <span>{getSourceTypeLabel(doc.sourceType)}</span>
                            {doc.chunkCount > 0 && (
                              <span>{formatChunkCount(doc.chunkCount)}</span>
                            )}
                            <span>{new Date(doc.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${statusInfo.color}`}>
                          {statusInfo.icon === "check" && <CheckCircle2 className="h-3 w-3" />}
                          {statusInfo.icon === "clock" && <Clock className="h-3 w-3 animate-spin" />}
                          {statusInfo.icon === "alert" && <AlertCircle className="h-3 w-3" />}
                          {statusInfo.label}
                        </span>
                        <button
                          onClick={() => setDeleteDocId(doc.id)}
                          className="hover:bg-destructive/10 hover:text-destructive text-muted-foreground rounded-lg p-1.5 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Agent Linking */}
        <div className="space-y-6">
          {/* Linked Agents */}
          <div className="bg-card rounded-2xl border border-border/50 p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-4">Linked Agents</h2>
            {kb.agents.length === 0 ? (
              <p className="text-muted-foreground text-center text-sm py-4">
                No agents linked yet
              </p>
            ) : (
              <div className="space-y-2">
                {kb.agents.map((link) => (
                  <div key={link.id} className="flex items-center justify-between rounded-xl border border-border/50 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="bg-primary/10 text-primary flex h-8 w-8 items-center justify-center rounded-lg text-xs font-semibold">
                        {link.agent.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm font-medium">{link.agent.name}</span>
                    </div>
                    <button
                      onClick={() => handleUnlinkAgent(link.agent.id)}
                      disabled={linkingAgent === link.agent.id}
                      className="hover:bg-destructive/10 hover:text-destructive text-muted-foreground rounded-lg p-1.5 transition-colors"
                    >
                      {linkingAgent === link.agent.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Unlink className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Link Agent */}
          {availableAgents.length > 0 && (
            <div className="bg-card rounded-2xl border border-border/50 p-6 shadow-sm">
              <h2 className="text-lg font-semibold mb-4">Link an Agent</h2>
              <div className="space-y-2">
                {availableAgents.map((agent) => (
                  <div key={agent.id} className="flex items-center justify-between rounded-xl border border-border/50 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="bg-muted flex h-8 w-8 items-center justify-center rounded-lg text-xs font-semibold">
                        {agent.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm font-medium">{agent.name}</span>
                    </div>
                    <button
                      onClick={() => handleLinkAgent(agent.id)}
                      disabled={linkingAgent === agent.id}
                      className="hover:bg-primary/10 hover:text-primary text-muted-foreground rounded-lg p-1.5 transition-colors"
                    >
                      {linkingAgent === agent.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Link2 className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Custom Text Entry Dialog */}
      <Dialog open={showTextEntry} onOpenChange={setShowTextEntry}>
        <DialogContent className="max-w-2xl rounded-2xl">
          <DialogHeader>
            <DialogTitle>Add Custom Text</DialogTitle>
            <DialogDescription>
              Paste or write content to add to your knowledge base. It will be automatically chunked for AI retrieval.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateTextEntry} className="space-y-4">
            {textError && (
              <div className="bg-destructive/10 text-destructive flex items-center gap-2 rounded-xl px-4 py-3 text-sm">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {textError}
              </div>
            )}
            <div>
              <label htmlFor="text-title" className="mb-2 block text-sm font-medium">
                Title <span className="text-destructive">*</span>
              </label>
              <input
                id="text-title"
                type="text"
                value={textTitle}
                onChange={(e) => setTextTitle(e.target.value)}
                placeholder="e.g., FAQ, Product Details, Support Info"
                className={`border-input bg-background placeholder:text-muted-foreground focus-visible:ring-ring h-11 w-full rounded-xl border px-4 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
                  textFieldErrors.title ? "border-destructive" : ""
                }`}
                maxLength={200}
              />
              {textFieldErrors.title && (
                <p className="text-destructive mt-1 text-xs">{textFieldErrors.title}</p>
              )}
            </div>
            <div>
              <label htmlFor="text-content" className="mb-2 block text-sm font-medium">
                Content <span className="text-destructive">*</span>
              </label>
              <textarea
                id="text-content"
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                placeholder="Paste or write your content here..."
                rows={12}
                className={`border-input bg-background placeholder:text-muted-foreground focus-visible:ring-ring flex w-full rounded-xl border px-4 py-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
                  textFieldErrors.content ? "border-destructive" : ""
                }`}
              />
              <div className="mt-1.5 flex items-center justify-between">
                {textFieldErrors.content ? (
                  <p className="text-destructive text-xs">{textFieldErrors.content}</p>
                ) : (
                  <span />
                )}
                <span className="text-muted-foreground text-xs">{textContent.length.toLocaleString()} characters</span>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowTextEntry(false)} className="rounded-xl">
                Cancel
              </Button>
              <Button type="submit" disabled={creatingText || !textTitle.trim() || textContent.length < 10} className="rounded-xl">
                {creatingText ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Content
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Document Dialog */}
      <Dialog open={!!deleteDocId} onOpenChange={() => setDeleteDocId(null)}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Delete Document</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this document? All associated chunks will be permanently removed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDocId(null)} className="rounded-xl">
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteDoc} disabled={deleting} className="rounded-xl">
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}


