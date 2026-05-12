/**
 * HTTP stateful transport mode with session management
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import { randomUUID } from "node:crypto";
import type { Request, Response } from "express";
import { createKasaServer } from "../server/create-server.js";
import type { ToolContext } from "../tools/types.js";
import type { Config } from "../config/index.js";

// How long a session may be idle before it is evicted (env: MCP_SESSION_IDLE_MS)
const SESSION_IDLE_MS = parseInt(
  process.env.MCP_SESSION_IDLE_MS || String(30 * 60 * 1000),
  10
);

// Maximum concurrent sessions (env: MCP_MAX_SESSIONS)
const MAX_SESSIONS = parseInt(process.env.MCP_MAX_SESSIONS || "100", 10);

interface SessionEntry {
  server: Server;
  transport: StreamableHTTPServerTransport;
  lastActivityAt: number;
}

async function closeSession(
  sessionId: string,
  entry: SessionEntry,
  sessions: Map<string, SessionEntry>
): Promise<void> {
  sessions.delete(sessionId);
  try {
    await entry.transport.close();
    await entry.server.close();
  } catch (err) {
    console.error(`[kasa-mcp] Error closing session ${sessionId}:`, err);
  }
}

export async function runHttpStateful(
  context: ToolContext,
  config: Config,
  signal: AbortSignal
): Promise<void> {
  const app = createMcpExpressApp({ host: config.transport.host });

  const sessions = new Map<string, SessionEntry>();

  // Periodically evict sessions that have been idle too long.
  const sweepInterval = setInterval(() => {
    const now = Date.now();
    for (const [id, entry] of sessions) {
      if (now - entry.lastActivityAt > SESSION_IDLE_MS) {
        console.error(`[kasa-mcp] Evicting idle session ${id}`);
        void closeSession(id, entry, sessions);
      }
    }
  }, Math.min(SESSION_IDLE_MS, 60_000));
  sweepInterval.unref();

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

  // POST /mcp
  app.post("/mcp", async (req: Request, res: Response) => {
    try {
      const sessionId = req.headers["mcp-session-id"] as string | undefined;
      const contentType = req.headers["content-type"];

      if (!contentType?.includes("application/json")) {
        return sendJsonRpcError(res, -32600, "Invalid Content-Type");
      }

      // New session (initialization request)
      if (!sessionId) {
        if (sessions.size >= MAX_SESSIONS) {
          return sendJsonRpcError(
            res,
            -32000,
            `Server is at capacity (max ${MAX_SESSIONS} sessions). Please try again later.`
          );
        }

        const server = createKasaServer(context);
        let resolvedSessionId: string | undefined;

        const transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: randomUUID,
          onsessioninitialized: (id) => {
            resolvedSessionId = id;
            sessions.set(id, {
              server,
              transport,
              lastActivityAt: Date.now(),
            });
          },
        });

        transport.onclose = () => {
          if (resolvedSessionId) {
            sessions.delete(resolvedSessionId);
          }
        };

        try {
          await server.connect(transport);
          await transport.handleRequest(req, res, req.body);
        } catch (error) {
          if (resolvedSessionId) {
            sessions.delete(resolvedSessionId);
          }
          console.error("[kasa-mcp] Error initializing session:", error);
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

      session.lastActivityAt = Date.now();

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

  // GET /mcp — SSE stream
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

      session.lastActivityAt = Date.now();
      await session.transport.handleRequest(req, res);
    } catch (error) {
      console.error("[kasa-mcp] Error in GET /mcp:", error);
      if (!res.headersSent) {
        res.status(500).send("Internal server error");
      }
    }
  });

  // DELETE /mcp — terminate session
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

      await closeSession(sessionId, session, sessions);
      res.json({ success: true, message: `Session ${sessionId} closed` });
    } catch (error) {
      console.error("[kasa-mcp] Error in DELETE /mcp:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Internal server error" });
      }
    }
  });

  const httpServer = app.listen(
    config.transport.port,
    config.transport.host,
    () => {
      console.error(
        `[kasa-mcp] HTTP Server listening on http://${config.transport.host}:${config.transport.port}/mcp (stateful mode)`
      );
    }
  );

  return new Promise<void>((resolve) => {
    signal.addEventListener("abort", async () => {
      console.error("[kasa-mcp] Shutting down stateful HTTP server...");
      clearInterval(sweepInterval);

      // Close all active sessions
      await Promise.allSettled(
        [...sessions.entries()].map(([id, entry]) =>
          closeSession(id, entry, sessions)
        )
      );

      httpServer.close(() => resolve());
    });
  });
}
