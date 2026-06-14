import * as z from "zod";

// Knowledge Base Form Validation
export const knowledgeBaseFormSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be 100 characters or less")
    .trim(),
  description: z
    .string()
    .max(500, "Description must be 500 characters or less")
    .optional()
    .or(z.literal("")),
});

export type KnowledgeBaseFormData = z.infer<typeof knowledgeBaseFormSchema>;

export const knowledgeBaseFormDefaults: KnowledgeBaseFormData = {
  name: "",
  description: "",
};

// Custom Text Entry Validation
export const customTextEntrySchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .max(200, "Title must be 200 characters or less")
    .trim(),
  content: z
    .string()
    .min(10, "Content must be at least 10 characters")
    .max(100000, "Content must be 100,000 characters or less"),
});

export type CustomTextEntryData = z.infer<typeof customTextEntrySchema>;

// Document Status
export const DOCUMENT_STATUS = {
  processing: {
    label: "Processing",
    color: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    icon: "clock",
  },
  ready: {
    label: "Ready",
    color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    icon: "check",
  },
  error: {
    label: "Error",
    color: "bg-red-500/10 text-red-600 dark:text-red-400",
    icon: "alert",
  },
} as const;

export type DocumentStatus = keyof typeof DOCUMENT_STATUS;

// Source Type Labels
export const SOURCE_TYPE_LABELS: Record<string, string> = {
  upload: "File Upload",
  crawl: "Web Crawl",
  text: "Custom Text",
};

// File Type Labels
export const FILE_TYPE_LABELS: Record<string, string> = {
  pdf: "PDF Document",
  docx: "Word Document",
  txt: "Text File",
  html: "Web Page",
};

// Allowed File Types
export const ALLOWED_FILE_TYPES = ["pdf", "docx", "txt"] as const;

// Max File Size (10MB)
export const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Helper Functions
export function formatKnowledgeBaseError(error: z.ZodError): string {
  const firstError = error.errors[0];
  if (firstError) {
    return firstError.message;
  }
  return "Validation failed";
}

export function getDocumentStatusInfo(status: string) {
  return DOCUMENT_STATUS[status as DocumentStatus] || DOCUMENT_STATUS.processing;
}

export function getSourceTypeLabel(sourceType: string): string {
  return SOURCE_TYPE_LABELS[sourceType] || sourceType;
}

export function getFileTypeLabel(fileType: string | null): string {
  if (!fileType) return "Unknown";
  return FILE_TYPE_LABELS[fileType] || fileType.toUpperCase();
}

export function formatChunkCount(count: number): string {
  if (count === 1) return "1 chunk";
  return `${count} chunks`;
}

export function formatDocumentCount(count: number): string {
  if (count === 1) return "1 document";
  return `${count} documents`;
}
