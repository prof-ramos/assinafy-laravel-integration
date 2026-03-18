import type {
  AssinafyConfig,
  AssinafyResponse,
  AssinafySigner,
  AssinafyDocument,
  CreateSignerPayload,
  UpdateSignerPayload,
  AssignmentVirtualPayload,
  AssignmentCollectPayload,
  WebhookDispatch,
} from "../types.js";
import {
  ASSINAFY_SANDBOX_URL,
  ASSINAFY_PRODUCTION_URL,
} from "../constants.js";

// ── Configuration ──

function loadConfig(): AssinafyConfig {
  const env = process.env.ASSINAFY_ENV ?? "sandbox";
  const baseUrl =
    env === "production" ? ASSINAFY_PRODUCTION_URL : ASSINAFY_SANDBOX_URL;

  const apiKey = process.env.ASSINAFY_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ASSINAFY_API_KEY environment variable is required. " +
        "Set it before starting the MCP server."
    );
  }

  const accountId = process.env.ASSINAFY_ACCOUNT_ID;
  if (!accountId) {
    throw new Error(
      "ASSINAFY_ACCOUNT_ID environment variable is required. " +
        "Set it before starting the MCP server."
    );
  }

  const timeoutMs = parseInt(process.env.ASSINAFY_TIMEOUT_MS ?? "30000", 10);

  return { baseUrl, apiKey, accountId, timeoutMs };
}

let _config: AssinafyConfig | undefined;

export function getConfig(): AssinafyConfig {
  if (!_config) {
    _config = loadConfig();
  }
  return _config;
}

// ── HTTP helpers ──

interface RequestOptions {
  method: string;
  path: string;
  body?: unknown;
  query?: Record<string, string | number | undefined>;
  isMultipart?: boolean;
  fileBuffer?: Buffer;
  fileName?: string;
}

export class AssinafyApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly errors?: Record<string, string[]>
  ) {
    super(message);
    this.name = "AssinafyApiError";
  }
}

async function request<T>(opts: RequestOptions): Promise<T> {
  const config = getConfig();

  // Build URL with query params
  const url = new URL(`${config.baseUrl}${opts.path}`);
  if (opts.query) {
    for (const [key, value] of Object.entries(opts.query)) {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    }
  }

  const headers: Record<string, string> = {
    "X-Api-Key": config.apiKey,
    Accept: "application/json",
  };

  let bodyInit: BodyInit | undefined;

  if (opts.isMultipart && opts.fileBuffer && opts.fileName) {
    // Multipart upload
    const boundary = `----AssinafyMCP${Date.now()}`;
    headers["Content-Type"] = `multipart/form-data; boundary=${boundary}`;

    const preamble = `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${opts.fileName}"\r\nContent-Type: application/pdf\r\n\r\n`;
    const epilogue = `\r\n--${boundary}--\r\n`;

    const preambleBuffer = Buffer.from(preamble, "utf-8");
    const epilogueBuffer = Buffer.from(epilogue, "utf-8");

    bodyInit = Buffer.concat([preambleBuffer, opts.fileBuffer, epilogueBuffer]);
  } else if (opts.body) {
    headers["Content-Type"] = "application/json";
    bodyInit = JSON.stringify(opts.body);
  }

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    config.timeoutMs ?? 30000
  );

  try {
    const response = await fetch(url.toString(), {
      method: opts.method,
      headers,
      body: bodyInit,
      signal: controller.signal,
    });

    if (!response.ok) {
      let errorBody: unknown;
      try {
        errorBody = await response.json();
      } catch {
        errorBody = await response.text();
      }

      const msg =
        typeof errorBody === "object" && errorBody !== null && "message" in errorBody
          ? String((errorBody as Record<string, unknown>).message)
          : `HTTP ${response.status}: ${response.statusText}`;

      const errors =
        typeof errorBody === "object" && errorBody !== null && "errors" in errorBody
          ? (errorBody as Record<string, unknown>).errors as Record<string, string[]>
          : undefined;

      throw new AssinafyApiError(response.status, msg, errors);
    }

    // Some endpoints (download) may return binary
    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      return (await response.json()) as T;
    }

    // For binary responses, return the buffer as base64
    const buffer = Buffer.from(await response.arrayBuffer());
    return { data: buffer.toString("base64"), content_type: contentType } as unknown as T;
  } finally {
    clearTimeout(timeout);
  }
}

// ── Signer operations ──

export async function createSigner(
  payload: CreateSignerPayload
): Promise<AssinafyResponse<AssinafySigner>> {
  const config = getConfig();
  return request({
    method: "POST",
    path: `/accounts/${config.accountId}/signers`,
    body: payload,
  });
}

export async function listSigners(
  page = 1,
  perPage = 25
): Promise<AssinafyResponse<AssinafySigner[]>> {
  const config = getConfig();
  return request({
    method: "GET",
    path: `/accounts/${config.accountId}/signers`,
    query: { page, "per-page": perPage },
  });
}

export async function getSigner(
  signerId: string
): Promise<AssinafyResponse<AssinafySigner>> {
  const config = getConfig();
  return request({
    method: "GET",
    path: `/accounts/${config.accountId}/signers/${signerId}`,
  });
}

export async function updateSigner(
  signerId: string,
  payload: UpdateSignerPayload
): Promise<AssinafyResponse<AssinafySigner>> {
  const config = getConfig();
  return request({
    method: "PUT",
    path: `/accounts/${config.accountId}/signers/${signerId}`,
    body: payload,
  });
}

// ── Document operations ──

export async function listDocuments(
  page = 1,
  perPage = 25,
  search?: string,
  status?: string,
  method?: string
): Promise<AssinafyResponse<AssinafyDocument[]>> {
  const config = getConfig();
  return request({
    method: "GET",
    path: `/accounts/${config.accountId}/documents`,
    query: { page, "per-page": perPage, search, status, method },
  });
}

export async function uploadDocument(
  fileBuffer: Buffer,
  fileName: string
): Promise<AssinafyResponse<AssinafyDocument>> {
  const config = getConfig();
  return request({
    method: "POST",
    path: `/accounts/${config.accountId}/documents`,
    isMultipart: true,
    fileBuffer,
    fileName,
  });
}

export async function getDocument(
  documentId: string
): Promise<AssinafyResponse<AssinafyDocument>> {
  return request({
    method: "GET",
    path: `/documents/${documentId}`,
  });
}

export async function downloadArtifact(
  documentId: string,
  artifactName: string
): Promise<{ data: string; content_type: string }> {
  return request({
    method: "GET",
    path: `/documents/${documentId}/download/${artifactName}`,
  });
}

export async function getDocumentStatuses(): Promise<AssinafyResponse<string[]>> {
  return request({
    method: "GET",
    path: `/documents/statuses`,
  });
}

// ── Assignment operations ──

export async function createVirtualAssignment(
  documentId: string,
  payload: Omit<AssignmentVirtualPayload, "method">
): Promise<AssinafyResponse<unknown>> {
  return request({
    method: "POST",
    path: `/documents/${documentId}/assignments`,
    body: { method: "virtual", ...payload },
  });
}

export async function createCollectAssignment(
  documentId: string,
  payload: Omit<AssignmentCollectPayload, "method">
): Promise<AssinafyResponse<unknown>> {
  return request({
    method: "POST",
    path: `/documents/${documentId}/assignments`,
    body: { method: "collect", ...payload },
  });
}

// ── Webhook operations ──

export async function listWebhookSubscriptions(): Promise<AssinafyResponse<unknown>> {
  const config = getConfig();
  return request({
    method: "GET",
    path: `/accounts/${config.accountId}/webhooks/subscriptions`,
  });
}

export async function updateWebhookSubscriptions(
  payload: unknown
): Promise<AssinafyResponse<unknown>> {
  const config = getConfig();
  return request({
    method: "PUT",
    path: `/accounts/${config.accountId}/webhooks/subscriptions`,
    body: payload,
  });
}

export async function inactivateWebhooks(): Promise<AssinafyResponse<unknown>> {
  const config = getConfig();
  return request({
    method: "PUT",
    path: `/accounts/${config.accountId}/webhooks/inactivate`,
  });
}

export async function getWebhookEventTypes(): Promise<AssinafyResponse<string[]>> {
  return request({
    method: "GET",
    path: `/webhooks/event-types`,
  });
}

export async function listWebhookDispatches(): Promise<
  AssinafyResponse<WebhookDispatch[]>
> {
  const config = getConfig();
  return request({
    method: "GET",
    path: `/accounts/${config.accountId}/webhooks`,
  });
}

export async function retryWebhookDispatch(
  dispatchId: string
): Promise<AssinafyResponse<unknown>> {
  const config = getConfig();
  return request({
    method: "POST",
    path: `/accounts/${config.accountId}/webhooks/${dispatchId}/retry`,
  });
}
