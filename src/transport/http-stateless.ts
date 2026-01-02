/**
 * HTTP stateless transport mode
 */

import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import type { Request, Response } from "express";
import { createKasaServer } from "../server/create-server.js";
import type { ToolContext } from "../tools/discover-devices.js";
import type { Config } from "../config/index.js";

export async function runHttpStateless(context: ToolContext, config: Config): Promise<void> {
  const app = createMcpExpressApp({ host: config.transport.host });

  // POST /mcp - Handle stateless requests
  app.post("/mcp", async (req: Request, res: Response) => {
    const server = createKasaServer(context);
    const transport = new StreamableHTTPServerTransport();

    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);

      res.on("close", () => {
        transport.close().catch((error) => {
          console.error("[kasa-mcp] Error closing transport:", error);
        });
        server.close().catch((error) => {
          console.error("[kasa-mcp] Error closing server:", error);
        });
      });
    } catch (error) {
      console.error("[kasa-mcp] Error handling stateless request:", error);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: "2.0",
          error: { code: -32603, message: "Internal server error" },
          id: null,
        });
      }
    }
  });

  const server = app.listen(config.transport.port, config.transport.host, () => {
    console.error(
      `[kasa-mcp] HTTP Server listening on http://${config.transport.host}:${config.transport.port}/mcp (stateless mode)`
    );
  });

  // Graceful shutdown
  process.on("SIGINT", () => {
    console.error("[kasa-mcp] Shutting down HTTP server...");
    server.close(() => {
      process.exit(0);
    });
  });
}

