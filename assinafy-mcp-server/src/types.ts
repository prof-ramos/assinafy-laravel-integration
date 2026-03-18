import type { DocumentStatus, ArtifactType, AssignmentMethod } from "./constants.js";

// ── API Response envelope ──
export interface AssinafyResponse<T> {
  data: T;
  meta?: {
    current_page: number;
    per_page: number;
    total: number;
    last_page: number;
  };
}

// ── Signer ──
export interface AssinafySigner {
  id: string;
  full_name: string;
  email: string;
  whatsapp_phone_number?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CreateSignerPayload {
  full_name: string;
  email: string;
  whatsapp_phone_number?: string;
}

export interface UpdateSignerPayload {
  full_name?: string;
  email?: string;
  whatsapp_phone_number?: string;
}

// ── Document ──
export interface AssinafyDocument {
  id: string;
  name?: string;
  status: DocumentStatus;
  method?: AssignmentMethod;
  created_at?: string;
  updated_at?: string;
  expires_at?: string;
  certificated_at?: string;
}

// ── Assignment ──
export interface AssignmentSigner {
  id: string;
}

export interface AssignmentVirtualPayload {
  method: "virtual";
  signers: AssignmentSigner[];
  message?: string;
  expires_at?: string;
}

export interface DisplaySettings {
  left: number;
  top: number;
  fontFamily?: string;
  fontSize?: number;
  backgroundColor?: string;
}

export interface CollectField {
  signer_id: string;
  field_id: string;
  display_settings: DisplaySettings;
}

export interface CollectEntry {
  page_id: string;
  fields: CollectField[];
}

export interface AssignmentCollectPayload {
  method: "collect";
  signers: AssignmentSigner[];
  entries: CollectEntry[];
  message?: string;
  expires_at?: string;
}

// ── Webhook ──
export interface WebhookSubscription {
  url: string;
  events?: string[];
  active?: boolean;
}

export interface WebhookDispatch {
  id: string;
  event: string;
  endpoint: string;
  delivered: boolean;
  http_status?: number;
  payload?: unknown;
  created_at?: string;
}

// ── API Client Config ──
export interface AssinafyConfig {
  baseUrl: string;
  apiKey: string;
  accountId: string;
  timeoutMs?: number;
}

// ── Errors ──
export interface AssinafyApiError {
  status: number;
  message: string;
  errors?: Record<string, string[]>;
}
