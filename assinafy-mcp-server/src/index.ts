import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express from "express";

import { registerSignerTools } from "./tools/signers.js";
import { registerDocumentTools } from "./tools/documents.js";
import { registerAssignmentTools } from "./tools/assignments.js";
import { registerWebhookTools } from "./tools/webhooks.js";

// ── Server initialization ──

const server = new McpServer({
  name: "assinafy-mcp-server",
  version: "1.0.0",
});

// ── Register all tools ──

registerSignerTools(server);
registerDocumentTools(server);
registerAssignmentTools(server);
registerWebhookTools(server);

// ── Transport selection ──

async function runStdio(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Assinafy MCP server running on stdio");
}

async function runHTTP(): Promise<void> {
  const app = express();
  app.use(express.json());

  app.post("/mcp", async (req, res) => {
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });
    res.on("close", () => transport.close());
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  });

  // Health check
  app.get("/health", (_req, res) => {
    res.json({ status: "ok", server: "assinafy-mcp-server", version: "1.0.0" });
  });

  const port = parseInt(process.env.PORT || "3100", 10);
  app.listen(port, () => {
    console.error(`Assinafy MCP server running on http://localhost:${port}/mcp`);
  });
}

// ── Main ──

const transport = process.env.TRANSPORT || "stdio";

if (transport === "http") {
  runHTTP().catch((error) => {
    console.error("Server error:", error);
    process.exit(1);
  });
} else {
  runStdio().catch((error) => {
    console.error("Server error:", error);
    process.exit(1);
  });
}
