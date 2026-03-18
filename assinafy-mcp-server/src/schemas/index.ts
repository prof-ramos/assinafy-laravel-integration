import { z } from "zod";
import {
  DOCUMENT_STATUSES,
  ARTIFACT_TYPES,
  ASSIGNMENT_METHODS,
} from "../constants.js";

// ── Pagination ──

export const PaginationSchema = {
  page: z.number().int().min(1).default(1).describe("Page number (1-indexed)"),
  per_page: z
    .number()
    .int()
    .min(1)
    .max(100)
    .default(25)
    .describe("Results per page (max 100)"),
};

// ── Signers ──

export const CreateSignerSchema = z
  .object({
    full_name: z.string().min(2).max(255).describe("Full legal name of the signer"),
    email: z.string().email().describe("Email address of the signer"),
    whatsapp_phone_number: z
      .string()
      .regex(/^55\d{10,11}$/, "Format: 55DDDNNNNNNNNN (Brazil)")
      .optional()
      .describe("WhatsApp phone in format 55DDDNNNNNNNNN"),
  })
  .strict();

export const UpdateSignerSchema = z
  .object({
    signer_id: z.string().min(1).describe("Assinafy signer ID"),
    full_name: z.string().min(2).max(255).optional().describe("Updated full name"),
    email: z.string().email().optional().describe("Updated email"),
    whatsapp_phone_number: z
      .string()
      .regex(/^55\d{10,11}$/)
      .optional()
      .describe("Updated WhatsApp phone"),
  })
  .strict();

export const GetSignerSchema = z
  .object({
    signer_id: z.string().min(1).describe("Assinafy signer ID"),
  })
  .strict();

export const ListSignersSchema = z.object(PaginationSchema).strict();

// ── Documents ──

export const ListDocumentsSchema = z
  .object({
    ...PaginationSchema,
    search: z.string().optional().describe("Search term for document name"),
    status: z
      .enum(DOCUMENT_STATUSES)
      .optional()
      .describe("Filter by document status"),
    method: z
      .enum(ASSIGNMENT_METHODS)
      .optional()
      .describe("Filter by assignment method: virtual or collect"),
  })
  .strict();

export const GetDocumentSchema = z
  .object({
    document_id: z.string().min(1).describe("Assinafy document ID"),
  })
  .strict();

export const UploadDocumentSchema = z
  .object({
    file_base64: z
      .string()
      .min(1)
      .describe("Base64-encoded PDF file content"),
    file_name: z
      .string()
      .min(1)
      .max(255)
      .describe("File name with .pdf extension"),
  })
  .strict();

export const DownloadArtifactSchema = z
  .object({
    document_id: z.string().min(1).describe("Assinafy document ID"),
    artifact_name: z
      .enum(ARTIFACT_TYPES)
      .describe("Artifact type: original, certificated, certificate-page, or bundle"),
  })
  .strict();

// ── Assignments ──

const SignerRefSchema = z.object({
  id: z.string().min(1).describe("Signer ID"),
});

export const CreateVirtualAssignmentSchema = z
  .object({
    document_id: z.string().min(1).describe("Assinafy document ID"),
    signers: z
      .array(SignerRefSchema)
      .min(1)
      .describe("Array of signer objects with id"),
    message: z
      .string()
      .max(500)
      .optional()
      .describe("Message sent to signers"),
    expires_at: z
      .string()
      .datetime()
      .optional()
      .describe("Expiration datetime in ISO 8601 format"),
  })
  .strict();

const DisplaySettingsSchema = z.object({
  left: z.number().describe("Left position in px"),
  top: z.number().describe("Top position in px"),
  fontFamily: z.string().optional().describe("Font family"),
  fontSize: z.number().optional().describe("Font size in px"),
  backgroundColor: z.string().optional().describe("Background color (CSS)"),
});

const CollectFieldSchema = z.object({
  signer_id: z.string().min(1).describe("Signer ID"),
  field_id: z.string().min(1).describe("Field ID from document metadata"),
  display_settings: DisplaySettingsSchema,
});

const CollectEntrySchema = z.object({
  page_id: z.string().min(1).describe("Page ID from document metadata"),
  fields: z.array(CollectFieldSchema).min(1),
});

export const CreateCollectAssignmentSchema = z
  .object({
    document_id: z.string().min(1).describe("Assinafy document ID"),
    signers: z
      .array(SignerRefSchema)
      .min(1)
      .describe("Array of signer objects with id"),
    entries: z
      .array(CollectEntrySchema)
      .min(1)
      .describe("Input field entries per page"),
    message: z
      .string()
      .max(500)
      .optional()
      .describe("Message sent to signers"),
    expires_at: z
      .string()
      .datetime()
      .optional()
      .describe("Expiration datetime in ISO 8601 format"),
  })
  .strict();

// ── Webhooks ──

export const RetryWebhookSchema = z
  .object({
    dispatch_id: z.string().min(1).describe("Webhook dispatch ID to retry"),
  })
  .strict();
