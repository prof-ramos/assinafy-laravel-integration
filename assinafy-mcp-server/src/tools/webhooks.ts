import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { RetryWebhookSchema } from "../schemas/index.js";
import * as api from "../services/api-client.js";
import { toolResultJson, toolResult, formatError } from "../services/formatter.js";

export function registerWebhookTools(server: McpServer): void {
  // ── List webhook subscriptions ──
  server.registerTool(
    "assinafy_list_webhook_subscriptions",
    {
      title: "List Webhook Subscriptions",
      description:
        "List active webhook subscriptions configured for the Assinafy account.",
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
        const result = await api.listWebhookSubscriptions();
        return toolResultJson(result);
      } catch (error) {
        return toolResult(formatError(error), true);
      }
    }
  );

  // ── Get webhook event types ──
  server.registerTool(
    "assinafy_get_webhook_event_types",
    {
      title: "Get Webhook Event Types",
      description:
        "Retrieve the official list of available webhook event types from Assinafy. " +
        "Use this to understand which events can be subscribed to.",
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
        const result = await api.getWebhookEventTypes();
        return toolResultJson(result);
      } catch (error) {
        return toolResult(formatError(error), true);
      }
    }
  );

  // ── List webhook dispatches ──
  server.registerTool(
    "assinafy_list_webhook_dispatches",
    {
      title: "List Webhook Dispatches",
      description:
        "List webhook dispatch history for the account. " +
        "Useful for auditing delivery status and debugging failed deliveries.",
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
        const result = await api.listWebhookDispatches();
        return toolResultJson(result);
      } catch (error) {
        return toolResult(formatError(error), true);
      }
    }
  );

  // ── Retry webhook dispatch ──
  server.registerTool(
    "assinafy_retry_webhook_dispatch",
    {
      title: "Retry Webhook Dispatch",
      description:
        "Retry a failed webhook dispatch by its ID. " +
        "Use after investigating delivery failures.\n\n" +
        "Args:\n" +
        "  - dispatch_id (string): Webhook dispatch ID to retry",
      inputSchema: RetryWebhookSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params) => {
      try {
        const result = await api.retryWebhookDispatch(params.dispatch_id);
        return toolResultJson(result);
      } catch (error) {
        return toolResult(formatError(error), true);
      }
    }
  );

  // ── Inactivate webhooks ──
  server.registerTool(
    "assinafy_inactivate_webhooks",
    {
      title: "Inactivate Webhooks",
      description:
        "Inactivate all webhook subscriptions for the account. " +
        "WARNING: This will stop all webhook deliveries. Use with caution.",
      inputSchema: {},
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async () => {
      try {
        const result = await api.inactivateWebhooks();
        return toolResultJson(result);
      } catch (error) {
        return toolResult(formatError(error), true);
      }
    }
  );
}
