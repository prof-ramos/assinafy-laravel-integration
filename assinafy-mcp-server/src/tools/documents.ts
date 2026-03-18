import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  ListDocumentsSchema,
  GetDocumentSchema,
  UploadDocumentSchema,
  DownloadArtifactSchema,
} from "../schemas/index.js";
import * as api from "../services/api-client.js";
import { toolResultJson, toolResult, formatError } from "../services/formatter.js";

export function registerDocumentTools(server: McpServer): void {
  // ── List documents ──
  server.registerTool(
    "assinafy_list_documents",
    {
      title: "List Documents",
      description:
        "List documents in the Assinafy account with optional filters.\n\n" +
        "Args:\n" +
        "  - page (number, default 1): Page number\n" +
        "  - per_page (number, default 25): Results per page\n" +
        "  - search (string, optional): Search by document name\n" +
        "  - status (string, optional): Filter by status (uploading, uploaded, metadata_processing, metadata_ready, expired, certificating, certificated, rejected_by_signer, pending_signature, rejected_by_user, failed)\n" +
        "  - method (string, optional): Filter by method (virtual, collect)",
      inputSchema: ListDocumentsSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params) => {
      try {
        const result = await api.listDocuments(
          params.page,
          params.per_page,
          params.search,
          params.status,
          params.method
        );
        return toolResultJson(result);
      } catch (error) {
        return toolResult(formatError(error), true);
      }
    }
  );

  // ── Get document ──
  server.registerTool(
    "assinafy_get_document",
    {
      title: "Get Document",
      description:
        "Retrieve details and current status of a specific document.\n\n" +
        "Args:\n" +
        "  - document_id (string): Assinafy document ID",
      inputSchema: GetDocumentSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params) => {
      try {
        const result = await api.getDocument(params.document_id);
        return toolResultJson(result);
      } catch (error) {
        return toolResult(formatError(error), true);
      }
    }
  );

  // ── Upload document ──
  server.registerTool(
    "assinafy_upload_document",
    {
      title: "Upload Document",
      description:
        "Upload a PDF document to Assinafy for signing. " +
        "The file must be a valid PDF encoded in base64. " +
        "After upload, the document will go through processing states (uploading → uploaded → metadata_processing → metadata_ready). " +
        "Wait for 'metadata_ready' before creating an assignment.\n\n" +
        "Args:\n" +
        "  - file_base64 (string): Base64-encoded PDF content\n" +
        "  - file_name (string): File name ending in .pdf",
      inputSchema: UploadDocumentSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (params) => {
      try {
        const buffer = Buffer.from(params.file_base64, "base64");
        if (buffer.length === 0) {
          return toolResult("Error: file_base64 decoded to empty buffer. Ensure it is valid base64-encoded PDF.", true);
        }
        if (!params.file_name.toLowerCase().endsWith(".pdf")) {
          return toolResult("Error: file_name must end with .pdf", true);
        }
        const result = await api.uploadDocument(buffer, params.file_name);
        return toolResultJson(result);
      } catch (error) {
        return toolResult(formatError(error), true);
      }
    }
  );

  // ── Download artifact ──
  server.registerTool(
    "assinafy_download_artifact",
    {
      title: "Download Artifact",
      description:
        "Download a document artifact from Assinafy. " +
        "Returns the artifact content as base64.\n\n" +
        "Args:\n" +
        "  - document_id (string): Assinafy document ID\n" +
        "  - artifact_name (string): Type of artifact to download: 'original', 'certificated', 'certificate-page', or 'bundle'",
      inputSchema: DownloadArtifactSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params) => {
      try {
        const result = await api.downloadArtifact(
          params.document_id,
          params.artifact_name
        );
        return toolResultJson(result);
      } catch (error) {
        return toolResult(formatError(error), true);
      }
    }
  );

  // ── Get document statuses ──
  server.registerTool(
    "assinafy_get_document_statuses",
    {
      title: "Get Document Statuses",
      description:
        "Retrieve the official list of possible document statuses from Assinafy. " +
        "Useful for understanding the document lifecycle.",
      inputSchema: {},
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async () => {
      try {
        const result = await api.getDocumentStatuses();
        return toolResultJson(result);
      } catch (error) {
        return toolResult(formatError(error), true);
      }
    }
  );
}
