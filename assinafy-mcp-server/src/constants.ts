// Assinafy API base URLs
export const ASSINAFY_SANDBOX_URL = "https://sandbox.assinafy.com.br/v1";
export const ASSINAFY_PRODUCTION_URL = "https://api.assinafy.com.br/v1";

// Character limit for MCP responses
export const CHARACTER_LIMIT = 50_000;

// Default pagination
export const DEFAULT_PAGE_SIZE = 25;
export const MAX_PAGE_SIZE = 100;

// Document statuses as documented by Assinafy
export const DOCUMENT_STATUSES = [
  "uploading",
  "uploaded",
  "metadata_processing",
  "metadata_ready",
  "expired",
  "certificating",
  "certificated",
  "rejected_by_signer",
  "pending_signature",
  "rejected_by_user",
  "failed",
] as const;

// Artifact types for download
export const ARTIFACT_TYPES = [
  "original",
  "certificated",
  "certificate-page",
  "bundle",
] as const;

// Assignment methods
export const ASSIGNMENT_METHODS = ["virtual", "collect"] as const;

// Webhook event types documented by Assinafy
export const WEBHOOK_EVENTS = [
  "document_prepared",
  "document_metadata_ready",
  "document_ready",
  "document_uploaded",
  "signature_requested",
  "signer_created",
  "signer_email_verified",
  "signer_signed_document",
  "signer_rejected_document",
  "signer_viewed_document",
  "document_processing_failed",
] as const;

export type DocumentStatus = (typeof DOCUMENT_STATUSES)[number];
export type ArtifactType = (typeof ARTIFACT_TYPES)[number];
export type AssignmentMethod = (typeof ASSIGNMENT_METHODS)[number];
export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];
