import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  CreateVirtualAssignmentSchema,
  CreateCollectAssignmentSchema,
} from "../schemas/index.js";
import * as api from "../services/api-client.js";
import { toolResultJson, toolResult, formatError } from "../services/formatter.js";

export function registerAssignmentTools(server: McpServer): void {
  // ── Create virtual assignment ──
  server.registerTool(
    "assinafy_create_virtual_assignment",
    {
      title: "Create Virtual Assignment",
      description:
        "Create a 'virtual' signature assignment on a document. " +
        "Virtual method is for automated signature flows without input fields. " +
        "ASOF policy: use 'virtual' ONLY for internal low/medium-risk documents with formal governance. " +
        "The document must be in 'metadata_ready' status before creating an assignment.\n\n" +
        "Args:\n" +
        "  - document_id (string): Document ID (must be metadata_ready)\n" +
        "  - signers (array): Array of {id: string} signer references\n" +
        "  - message (string, optional): Message sent to signers\n" +
        "  - expires_at (string, optional): ISO 8601 expiration datetime",
      inputSchema: CreateVirtualAssignmentSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (params) => {
      try {
        const { document_id, ...payload } = params;
        const result = await api.createVirtualAssignment(document_id, payload);
        return toolResultJson(result);
      } catch (error) {
        return toolResult(formatError(error), true);
      }
    }
  );

  // ── Create collect assignment ──
  server.registerTool(
    "assinafy_create_collect_assignment",
    {
      title: "Create Collect Assignment",
      description:
        "Create a 'collect' signature assignment on a document with positioned input fields. " +
        "Collect method provides stronger evidence of active signer participation. " +
        "ASOF policy: preferred for sensitive, external, or high-contestation-risk documents. " +
        "Requires page_id and field_id from document metadata, plus display_settings for positioning.\n\n" +
        "Args:\n" +
        "  - document_id (string): Document ID (must be metadata_ready)\n" +
        "  - signers (array): Array of {id: string} signer references\n" +
        "  - entries (array): Per-page field entries with display settings\n" +
        "  - message (string, optional): Message to signers\n" +
        "  - expires_at (string, optional): ISO 8601 expiration datetime",
      inputSchema: CreateCollectAssignmentSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (params) => {
      try {
        const { document_id, ...payload } = params;
        const result = await api.createCollectAssignment(document_id, payload);
        return toolResultJson(result);
      } catch (error) {
        return toolResult(formatError(error), true);
      }
    }
  );
}
