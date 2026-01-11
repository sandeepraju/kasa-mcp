/**
 * HTTP stateful transport mode with session management
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import { randomUUID } from "node:crypto";
import type { Request, Response } from "express";
import { createKasaServer } from "../server/create-server.js";
import type { ToolContext } from "../tools/discover-devices.js";
import type { Config } from "../config/index.js";

export async function runHttpStateful(context: ToolContext, config: Config): Promise<void> {
  const app = createMcpExpressApp({ host: config.transport.host });

  // Map to store active sessions
  const sessions = new Map<
    string,
    { server: Server; transport: StreamableHTTPServerTransport }
  >();

  // Helper to handle request errors
  const sendJsonRpcError = (
    res: Response,
    code: number,
    message: string,
    id?: number | string | null
  ) => {
    if (!res.headersSent) {
      res.status(400).json({
        jsonrpc: "2.0",
        error: { code, message },
        id: id ?? null,
      });
    }
  };

  // POST /mcp - Main endpoint
  app.post("/mcp", async (req: Request, res: Response) => {
    try {
      const sessionId = req.headers["mcp-session-id"] as string | undefined;
      const contentType = req.headers["content-type"];

      if (!contentType || !contentType.includes("application/json")) {
        return sendJsonRpcError(res, -32600, "Invalid Content-Type");
      }

      // New session (initialization request)
      if (!sessionId) {
        const newSessionId = randomUUID();
        const server = createKasaServer(context);
        const transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => newSessionId,
        });

        sessions.set(newSessionId, { server, transport });

        try {
          await server.connect(transport);
          await transport.handleRequest(req, res, req.body);

          // Clean up on transport close
          const onTransportClose = () => {
            sessions.delete(newSessionId);
            transport.onclose?.();
          };
          transport.onclose = onTransportClose;
        } catch (error) {
          sessions.delete(newSessionId);
          console.error(`[kasa-mcp] Error initializing session ${newSessionId}:`, error);
          if (!res.headersSent) {
            res.status(500).json({
              jsonrpc: "2.0",
              error: { code: -32603, message: "Internal server error" },
              id: null,
            });
          }
        }
        return;
      }

      // Existing session
      const session = sessions.get(sessionId);
      if (!session) {
        return sendJsonRpcError(res, -32000, `Invalid session ID: ${sessionId}`);
      }

      try {
        await session.transport.handleRequest(req, res, req.body);
      } catch (error) {
        console.error(
          `[kasa-mcp] Error handling request for session ${sessionId}:`,
          error
        );
        if (!res.headersSent) {
          res.status(500).json({
            jsonrpc: "2.0",
            error: { code: -32603, message: "Internal server error" },
            id: null,
          });
        }
      }
    } catch (error) {
      console.error("[kasa-mcp] Unexpected error in POST /mcp:", error);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: "2.0",
          error: { code: -32603, message: "Internal server error" },
          id: null,
        });
      }
    }
  });

  // GET /mcp - SSE stream
  app.get("/mcp", async (req: Request, res: Response) => {
    try {
      const sessionId = req.headers["mcp-session-id"] as string | undefined;
      if (!sessionId) {
        res.status(400).send("Missing MCP-Session-ID header");
        return;
      }

      const session = sessions.get(sessionId);
      if (!session) {
        res.status(400).send(`Invalid session ID: ${sessionId}`);
        return;
      }

      await session.transport.handleRequest(req, res);
    } catch (error) {
      console.error("[kasa-mcp] Error in GET /mcp:", error);
      if (!res.headersSent) {
        res.status(500).send("Internal server error");
      }
    }
  });

  // DELETE /mcp - Terminate session
  app.delete("/mcp", async (req: Request, res: Response) => {
    try {
      const sessionId = req.headers["mcp-session-id"] as string | undefined;
      if (!sessionId) {
        res.status(400).json({ error: "Missing MCP-Session-ID header" });
        return;
      }

      const session = sessions.get(sessionId);
      if (!session) {
        res.status(400).json({ error: `Invalid session ID: ${sessionId}` });
        return;
      }

      await session.transport.close();
      await session.server.close();
      sessions.delete(sessionId);

      res.json({ success: true, message: `Session ${sessionId} closed` });
    } catch (error) {
      console.error("[kasa-mcp] Error in DELETE /mcp:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Internal server error" });
      }
    }
  });

  const server = app.listen(config.transport.port, config.transport.host, () => {
    console.error(
      `[kasa-mcp] HTTP Server listening on http://${config.transport.host}:${config.transport.port}/mcp (stateful mode)`
    );
  });

  // Graceful shutdown
  process.on("SIGINT", async () => {
    console.error("[kasa-mcp] Shutting down HTTP server...");
    for (const [sessionId, session] of sessions) {
      try {
        await session.transport.close();
        await session.server.close();
      } catch (error) {
        console.error(`[kasa-mcp] Error closing session ${sessionId}:`, error);
      }
    }
    server.close(() => {
      process.exit(0);
    });
  });
}


