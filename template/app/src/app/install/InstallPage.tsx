import { useState, useEffect } from "react";
import { type AuthUser } from "wasp/auth";
import { useQuery } from "wasp/client/operations";
import { getWebsites } from "wasp/client/operations";
import { Link, routes } from "wasp/client/router";
import {
  Download, Copy, Check, Globe, Code2, Shield, Loader2,
  ExternalLink, ChevronRight, AlertCircle, CheckCircle2,
} from "lucide-react";
import { AppLayout } from "../layout/AppLayout";

function EmbedCodeBlock({ code, websiteId }: { code: string; websiteId: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <div className="bg-muted relative rounded-xl p-4">
      <pre className="font-mono text-xs overflow-x-auto whitespace-pre-wrap break-all pr-20">{code}</pre>
      <button
        onClick={handleCopy}
        className="absolute right-2 top-2 bg-background hover:bg-accent inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors border"
      >
        {copied ? <><Check className="h-3.5 w-3.5" /> Copied</> : <><Copy className="h-3.5 w-3.5" /> Copy</>}
      </button>
    </div>
  );
}

function VerificationStatus({ websiteId, url }: { websiteId: string; url: string }) {
  const [status, setStatus] = useState<"checking" | "verified" | "not_verified">("checking");

  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch(`/api/widget/${websiteId}/config`);
        setStatus(res.ok ? "verified" : "not_verified");
      } catch {
        setStatus("not_verified");
      }
    };
    const timer = setTimeout(check, 1000);
    return () => clearTimeout(timer);
  }, [websiteId]);

  return (
    <div className="flex items-center gap-2">
      {status === "checking" && (
        <>
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          <span className="text-muted-foreground text-xs">Verifying...</span>
        </>
      )}
      {status === "verified" && (
        <>
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          <span className="text-emerald-600 dark:text-emerald-400 text-xs font-medium">Widget active</span>
        </>
      )}
      {status === "not_verified" && (
        <>
          <AlertCircle className="h-4 w-4 text-amber-500" />
          <span className="text-amber-600 dark:text-amber-400 text-xs font-medium">Not detected yet</span>
        </>
      )}
    </div>
  );
}

export function InstallPage({ user }: { user: AuthUser }) {
  const { data: websites, isLoading } = useQuery(getWebsites);
  const [activeStep, setActiveStep] = useState(0);

  const steps = [
    { title: "Copy the embed code", description: "Get the widget script tag for your website" },
    { title: "Add to your website", description: "Paste the code into your HTML" },
    { title: "Verify installation", description: "Confirm the widget is working" },
  ];

  return (
    <AppLayout user={user}>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight lg:text-4xl">Install Widget</h1>
        <p className="text-muted-foreground mt-2 text-base lg:text-lg">
          Add the AI chat widget to your website in minutes
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
        </div>
      ) : !websites || websites.length === 0 ? (
        /* No Websites */
        <div className="flex flex-col items-center justify-center py-24">
          <div className="bg-primary/10 mb-6 flex h-20 w-20 items-center justify-center rounded-2xl">
            <Globe className="text-primary h-10 w-10" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight">No websites configured</h2>
          <p className="text-muted-foreground mt-3 mb-8 max-w-lg text-center text-base">
            Add a website first to get your embed code and install the chat widget.
          </p>
          <Link
            to={routes.NewWebsiteRoute.to}
            className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold transition-all shadow-lg shadow-primary/25"
          >
            Add Your First Website
          </Link>
        </div>
      ) : (
        <div className="mx-auto max-w-4xl space-y-8">
          {/* Steps Progress */}
          <div className="bg-card rounded-2xl border border-border/50 p-6 shadow-sm">
            <div className="flex items-center justify-between">
              {steps.map((step, i) => (
                <div key={i} className="flex items-center">
                  <button
                    onClick={() => setActiveStep(i)}
                    className={`flex items-center gap-3 transition-colors ${
                      activeStep === i ? "text-primary" : activeStep > i ? "text-emerald-500" : "text-muted-foreground"
                    }`}
                  >
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                        activeStep === i
                          ? "bg-primary text-primary-foreground"
                          : activeStep > i
                            ? "bg-emerald-500 text-white"
                            : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {activeStep > i ? <Check className="h-4 w-4" /> : i + 1}
                    </div>
                    <div className="hidden sm:block">
                      <p className="text-sm font-medium">{step.title}</p>
                      <p className="text-muted-foreground text-xs">{step.description}</p>
                    </div>
                  </button>
                  {i < steps.length - 1 && (
                    <ChevronRight className="mx-3 hidden h-4 w-4 text-muted-foreground sm:block" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Website Embed Codes */}
          {websites.map((website) => {
            const embedCode = `<script src="${window.location.origin}/widget/widget.js" data-website-id="${website.id}" defer></script>`;
            return (
              <div key={website.id} className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden">
                {/* Website Header */}
                <div className="flex items-center justify-between border-b border-border/50 px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/10 text-primary flex h-10 w-10 items-center justify-center rounded-xl">
                      <Globe className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{website.name}</h3>
                      <p className="text-muted-foreground text-xs">{website.url}</p>
                    </div>
                  </div>
                  <VerificationStatus websiteId={website.id} url={website.url} />
                </div>

                <div className="p-6 space-y-6">
                  {/* Step 1: Embed Code */}
                  <div>
                    <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                      <Code2 className="h-4 w-4 text-muted-foreground" />
                      1. Copy the embed code
                    </h4>
                    <p className="text-muted-foreground mb-3 text-xs">
                      Add this script tag to the <code className="bg-muted rounded px-1">&lt;head&gt;</code> section of your HTML.
                    </p>
                    <EmbedCodeBlock code={embedCode} websiteId={website.id} />
                  </div>

                  {/* Step 2: Instructions */}
                  <div>
                    <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                      <Download className="h-4 w-4 text-muted-foreground" />
                      2. Add to your website
                    </h4>
                    <div className="bg-muted/50 rounded-xl p-4 space-y-3 text-xs text-muted-foreground">
                      <div className="flex items-start gap-3">
                        <span className="bg-primary/10 text-primary mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold">A</span>
                        <p>
                          <strong className="text-foreground">WordPress:</strong>{" "}
                          Go to Appearance → Theme Editor → Header (header.php) and paste the code before the closing <code className="bg-muted rounded px-1">&lt;/head&gt;</code> tag.
                        </p>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="bg-primary/10 text-primary mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold">B</span>
                        <p>
                          <strong className="text-foreground">Shopify:</strong>{" "}
                          Go to Online Store → Themes → Edit code → theme.liquid and paste the code before <code className="bg-muted rounded px-1">&lt;/head&gt;</code>.
                        </p>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="bg-primary/10 text-primary mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold">C</span>
                        <p>
                          <strong className="text-foreground">HTML/Next.js/React:</strong>{" "}
                          Paste the script tag in your <code className="bg-muted rounded px-1">&lt;head&gt;</code> component or <code className="bg-muted rounded px-1">layout.tsx</code>.
                        </p>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="bg-primary/10 text-primary mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold">D</span>
                        <p>
                          <strong className="text-foreground">Webflow:</strong>{" "}
                          Go to Project Settings → Custom Code → Head Code and paste the code.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Step 3: Verify */}
                  <div>
                    <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                      <Shield className="h-4 w-4 text-muted-foreground" />
                      3. Verify installation
                    </h4>
                    <div className="bg-muted/50 rounded-xl p-4 space-y-2 text-xs text-muted-foreground">
                      <p>After adding the code, visit your website and look for the chat bubble in the {website.widgetPosition === "left" ? "bottom-left" : "bottom-right"} corner.</p>
                      <div className="flex items-center gap-2 pt-1">
                        <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: website.widgetColor }} />
                        <span>Widget color: {website.widgetColor}</span>
                        <span className="text-muted-foreground/50">•</span>
                        <span>Position: {website.widgetPosition === "right" ? "Bottom Right" : "Bottom Left"}</span>
                      </div>
                    </div>
                    <div className="mt-3">
                      <a
                        href={website.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Open your website
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Help */}
          <div className="bg-muted/50 rounded-2xl p-6 text-center">
            <p className="text-muted-foreground text-sm">
              Need help? Check our{" "}
              <a href="https://docs.opensaas.sh" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">
                documentation
              </a>{" "}
              or{" "}
              <a href="https://github.com/anomalyco/opencode/issues" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">
                open an issue
              </a>.
            </p>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
