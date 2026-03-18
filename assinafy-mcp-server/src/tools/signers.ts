import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  CreateSignerSchema,
  UpdateSignerSchema,
  GetSignerSchema,
  ListSignersSchema,
} from "../schemas/index.js";
import * as api from "../services/api-client.js";
import { toolResultJson, toolResult, formatError } from "../services/formatter.js";

export function registerSignerTools(server: McpServer): void {
  // ── Create signer ──
  server.registerTool(
    "assinafy_create_signer",
    {
      title: "Create Signer",
      description:
        "Create a new signer in the Assinafy account. " +
        "Returns the created signer object with its ID. " +
        "A signer represents a person who will sign documents.\n\n" +
        "Args:\n" +
        "  - full_name (string): Full legal name\n" +
        "  - email (string): Email address\n" +
        "  - whatsapp_phone_number (string, optional): Brazilian phone 55DDDNNNNNNNNN",
      inputSchema: CreateSignerSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (params) => {
      try {
        const result = await api.createSigner(params);
        return toolResultJson(result);
      } catch (error) {
        return toolResult(formatError(error), true);
      }
    }
  );

  // ── List signers ──
  server.registerTool(
    "assinafy_list_signers",
    {
      title: "List Signers",
      description:
        "List all signers registered in the Assinafy account with pagination.\n\n" +
        "Args:\n" +
        "  - page (number, default 1): Page number\n" +
        "  - per_page (number, default 25): Results per page (max 100)",
      inputSchema: ListSignersSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params) => {
      try {
        const result = await api.listSigners(params.page, params.per_page);
        return toolResultJson(result);
      } catch (error) {
        return toolResult(formatError(error), true);
      }
    }
  );

  // ── Get signer ──
  server.registerTool(
    "assinafy_get_signer",
    {
      title: "Get Signer",
      description:
        "Retrieve details of a specific signer by ID.\n\n" +
        "Args:\n" +
        "  - signer_id (string): Assinafy signer ID",
      inputSchema: GetSignerSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params) => {
      try {
        const result = await api.getSigner(params.signer_id);
        return toolResultJson(result);
      } catch (error) {
        return toolResult(formatError(error), true);
      }
    }
  );

  // ── Update signer ──
  server.registerTool(
    "assinafy_update_signer",
    {
      title: "Update Signer",
      description:
        "Update an existing signer's information. " +
        "IMPORTANT: A signer can only be updated while NOT associated with an active document.\n\n" +
        "Args:\n" +
        "  - signer_id (string): Assinafy signer ID\n" +
        "  - full_name (string, optional): Updated name\n" +
        "  - email (string, optional): Updated email\n" +
        "  - whatsapp_phone_number (string, optional): Updated phone",
      inputSchema: UpdateSignerSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params) => {
      try {
        const { signer_id, ...payload } = params;
        const result = await api.updateSigner(signer_id, payload);
        return toolResultJson(result);
      } catch (error) {
        return toolResult(formatError(error), true);
      }
    }
  );
}
