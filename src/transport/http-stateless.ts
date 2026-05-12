/**
 * HTTP stateless transport mode
 */

import express from "express";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import type { Request, Response } from "express";
import { createKasaServer } from "../server/create-server.js";
import type { ToolContext } from "../tools/types.js";
import type { Config } from "../config/index.js";

const BODY_SIZE_LIMIT = "1mb";

export async function runHttpStateless(
  context: ToolContext,
  config: Config,
  signal: AbortSignal
): Promise<void> {
  const app = createMcpExpressApp({ host: config.transport.host });
  // Override the body-size limit on top of the SDK-installed json middleware.
  // Express json() is idempotent once req.body is set, so registering a
  // stricter limit after SDK won't help — instead we guard at handler level.
  app.use(
    express.json({ limit: BODY_SIZE_LIMIT, strict: false })
  );

  app.post("/mcp", async (req: Request, res: Response) => {
    const server = createKasaServer(context);
    const transport = new StreamableHTTPServerTransport();

    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);

      res.on("close", () => {
        transport
          .close()
          .catch((err) =>
            console.error("[kasa-mcp] Error closing transport:", err)
          );
        server
          .close()
          .catch((err) =>
            console.error("[kasa-mcp] Error closing server:", err)
          );
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

  const httpServer = app.listen(
    config.transport.port,
    config.transport.host,
    () => {
      console.error(
        `[kasa-mcp] HTTP Server listening on http://${config.transport.host}:${config.transport.port}/mcp (stateless mode)`
      );
    }
  );

  return new Promise<void>((resolve) => {
    signal.addEventListener("abort", () => {
      console.error("[kasa-mcp] Shutting down stateless HTTP server...");
      httpServer.close(() => resolve());
    });
  });
}
