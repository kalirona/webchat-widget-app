import { useNavigate } from "react-router";
import { useState } from "react";
import { type AuthUser } from "wasp/auth";
import { useAction } from "wasp/client/operations";
import { createKnowledgeBase } from "wasp/client/operations";
import { Link, routes } from "wasp/client/router";
import { BookOpen, ArrowLeft, Loader2, AlertCircle } from "lucide-react";
import { AppLayout } from "../layout/AppLayout";
import { Button } from "../../client/components/ui/button";
import { knowledgeBaseFormSchema, formatKnowledgeBaseError } from "./constants";

export function NewKnowledgeBasePage({ user }: { user: AuthUser }) {
  const navigate = useNavigate();
  const createKnowledgeBaseAction = useAction(createKnowledgeBase);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const validateField = (fieldName: string, value: unknown) => {
    try {
      const shape = knowledgeBaseFormSchema.shape as Record<string, { safeParse: (v: unknown) => { success: boolean; error?: { issues: { message: string }[] } } }>;
      const fieldSchema = shape[fieldName];
      if (fieldSchema) {
        const result = fieldSchema.safeParse(value);
        if (!result.success) {
          setFieldErrors((prev) => ({ ...prev, [fieldName]: result.error?.issues[0]?.message || "Invalid" }));
        } else {
          setFieldErrors((prev) => {
            const next = { ...prev };
            delete next[fieldName];
            return next;
          });
        }
      }
    } catch {
      // Field not in schema
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    const formData = {
      name: name.trim(),
      description: description.trim() || undefined,
    };

    const validation = knowledgeBaseFormSchema.safeParse(formData);
    if (!validation.success) {
      setError(formatKnowledgeBaseError(validation.error));
      const errors: Record<string, string> = {};
      validation.error.issues.forEach((err) => {
        const field = err.path[0];
        if (typeof field === "string") {
          errors[field] = err.message;
        }
      });
      setFieldErrors(errors);
      return;
    }

    setSaving(true);
    try {
      const kb = await createKnowledgeBaseAction(validation.data) as any;
      navigate(`/app/knowledge/${kb.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create knowledge base");
    } finally {
      setSaving(false);
    }
  };

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
        <h1 className="text-3xl font-bold tracking-tight lg:text-4xl">Create Knowledge Base</h1>
        <p className="text-muted-foreground mt-2 text-base lg:text-lg">
          Create a repository for documents and content used by your AI agents
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Form - Left Column */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit}>
            {/* Error Alert */}
            {error && (
              <div className="bg-destructive/10 text-destructive mb-6 flex items-center gap-3 rounded-2xl px-5 py-4">
                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                <p className="text-sm font-medium">{error}</p>
              </div>
            )}

            <div className="bg-card rounded-2xl border border-border/50 p-6 shadow-sm">
              <h2 className="text-lg font-semibold mb-5">Basic Information</h2>
              <div className="space-y-5">
                {/* Name */}
                <div>
                  <label htmlFor="name" className="mb-2 block text-sm font-medium">
                    Name <span className="text-destructive">*</span>
                  </label>
                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      validateField("name", e.target.value);
                    }}
                    placeholder="e.g., Product Documentation"
                    className={`border-input bg-background placeholder:text-muted-foreground focus-visible:ring-ring h-11 w-full rounded-xl border px-4 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
                      fieldErrors.name ? "border-destructive" : ""
                    }`}
                    maxLength={100}
                  />
                  <div className="mt-1.5 flex items-center justify-between">
                    {fieldErrors.name ? (
                      <p className="text-destructive text-xs">{fieldErrors.name}</p>
                    ) : (
                      <span />
                    )}
                    <span className="text-muted-foreground text-xs">{name.length}/100</span>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label htmlFor="description" className="mb-2 block text-sm font-medium">
                    Description
                  </label>
                  <textarea
                    id="description"
                    value={description}
                    onChange={(e) => {
                      setDescription(e.target.value);
                      validateField("description", e.target.value);
                    }}
                    placeholder="Briefly describe what this knowledge base contains..."
                    rows={4}
                    className={`border-input bg-background placeholder:text-muted-foreground focus-visible:ring-ring flex w-full rounded-xl border px-4 py-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
                      fieldErrors.description ? "border-destructive" : ""
                    }`}
                    maxLength={500}
                  />
                  <div className="mt-1.5 flex items-center justify-between">
                    {fieldErrors.description ? (
                      <p className="text-destructive text-xs">{fieldErrors.description}</p>
                    ) : (
                      <span />
                    )}
                    <span className="text-muted-foreground text-xs">{description.length}/500</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Submit */}
            <div className="bg-card mt-6 rounded-2xl border border-border/50 p-6 shadow-sm">
              <Button
                type="submit"
                disabled={saving || !name.trim()}
                className="h-11 w-full rounded-xl text-sm font-semibold shadow-lg shadow-primary/25"
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Knowledge Base...
                  </>
                ) : (
                  <>
                    <BookOpen className="mr-2 h-4 w-4" />
                    Create Knowledge Base
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>

        {/* Info Panel - Right Column */}
        <div className="space-y-6">
          <div className="bg-card rounded-2xl border border-border/50 p-6 shadow-sm">
            <h3 className="text-lg font-semibold mb-4">What's a Knowledge Base?</h3>
            <p className="text-muted-foreground text-sm mb-4">
              A knowledge base is a collection of documents and content that your AI agents can reference when answering questions.
            </p>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="bg-blue-500/10 mt-0.5 flex h-6 w-6 items-center justify-center rounded-lg">
                  <span className="text-blue-500 text-xs font-bold">1</span>
                </div>
                <div>
                  <p className="text-sm font-medium">Upload Files</p>
                  <p className="text-muted-foreground text-xs">PDF, DOCX, or TXT documents</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="bg-emerald-500/10 mt-0.5 flex h-6 w-6 items-center justify-center rounded-lg">
                  <span className="text-emerald-500 text-xs font-bold">2</span>
                </div>
                <div>
                  <p className="text-sm font-medium">Crawl Websites</p>
                  <p className="text-muted-foreground text-xs">Extract content from web pages</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="bg-violet-500/10 mt-0.5 flex h-6 w-6 items-center justify-center rounded-lg">
                  <span className="text-violet-500 text-xs font-bold">3</span>
                </div>
                <div>
                  <p className="text-sm font-medium">Add Custom Text</p>
                  <p className="text-muted-foreground text-xs">Paste or write content directly</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="bg-amber-500/10 mt-0.5 flex h-6 w-6 items-center justify-center rounded-lg">
                  <span className="text-amber-500 text-xs font-bold">4</span>
                </div>
                <div>
                  <p className="text-sm font-medium">Link to Agents</p>
                  <p className="text-muted-foreground text-xs">Connect to your AI agents</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-2xl border border-border/50 p-6 shadow-sm">
            <h3 className="text-lg font-semibold mb-3">Supported Formats</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <span className="bg-red-500/10 text-red-600 dark:text-red-400 rounded-lg px-2 py-0.5 text-xs font-medium">PDF</span>
                <span className="text-muted-foreground">PDF documents</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg px-2 py-0.5 text-xs font-medium">DOCX</span>
                <span className="text-muted-foreground">Word documents</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="bg-gray-500/10 text-gray-600 dark:text-gray-400 rounded-lg px-2 py-0.5 text-xs font-medium">TXT</span>
                <span className="text-muted-foreground">Plain text files</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="bg-green-500/10 text-green-600 dark:text-green-400 rounded-lg px-2 py-0.5 text-xs font-medium">URL</span>
                <span className="text-muted-foreground">Web pages & sitemaps</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}




