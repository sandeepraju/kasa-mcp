#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { randomUUID } from "node:crypto";
import type { Express, Request, Response } from "express";
import { z } from "zod";

// Configuration from environment variables
const TRANSPORT_MODE = process.env.MCP_TRANSPORT || "stdio";
const HTTP_PORT = parseInt(process.env.MCP_PORT || "3000", 10);
const HTTP_HOST = process.env.MCP_HOST || "127.0.0.1";
const SESSION_MODE = process.env.MCP_SESSION_MODE !== "stateless";

// Tool definitions with Zod schemas
const GetDevicesToolSchema = z.object({
  // Define your tool parameters here
});

/**
 * Factory function to create a configured MCP server instance.
 * This allows creating multiple server instances for HTTP stateless mode
 * or a single instance for stdio/stateful HTTP modes.
 */
function createKasaServer(): Server {
  const server = new Server(
    {
      name: "kasa-mcp",
      version: "0.1.0",
    },
    {
      capabilities: {
        tools: {},
        resources: {},
      },
    }
  );

  // Register tool list handler
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: "get_devices",
          description: "Get list of Kasa smart devices",
          inputSchema: {
            type: "object",
            properties: {},
          },
        },
        // Add more tools here
      ],
    };
  });

  // Register tool call handler
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    switch (name) {
      case "get_devices":
        // Implement your Kasa device logic here
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ devices: [] }),
            },
          ],
        };

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  });

  // Register resource handlers (optional)
  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    return {
      resources: [],
    };
  });

  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const { uri } = request.params;
    throw new Error(`Resource not found: ${uri}`);
  });

  return server;
}

/**
 * Run in stdio mode (default, for Claude Desktop compatibility)
 */
async function runStdio(): Promise<void> {
  const server = createKasaServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);

  // Error handling
  transport.onerror = (error) => {
    console.error("[MCP Error]", error);
  };

  process.on("SIGINT", async () => {
    await server.close();
    process.exit(0);
  });
}

/**
 * Run in HTTP stateful mode with session management.
 * Each session has its own server instance that maintains state across requests.
 */
async function runHttpStateful(): Promise<void> {
  const app = createMcpExpressApp({ host: HTTP_HOST });

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

  // POST /mcp - Main endpoint for JSON-RPC requests
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
        const server = createKasaServer();
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
          console.error(`Error initializing session ${newSessionId}:`, error);
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

      // Existing session (subsequent request)
      const session = sessions.get(sessionId);
      if (!session) {
        return sendJsonRpcError(
          res,
          -32000,
          `Invalid session ID: ${sessionId}`
        );
      }

      try {
        await session.transport.handleRequest(req, res, req.body);
      } catch (error) {
        console.error(
          `Error handling request for session ${sessionId}:`,
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
      console.error("Unexpected error in POST /mcp:", error);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: "2.0",
          error: { code: -32603, message: "Internal server error" },
          id: null,
        });
      }
    }
  });

  // GET /mcp - SSE stream for notifications (stateful mode only)
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
      console.error("Error in GET /mcp:", error);
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
      console.error("Error in DELETE /mcp:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Internal server error" });
      }
    }
  });

  const server = app.listen(HTTP_PORT, HTTP_HOST, () => {
    console.error(
      `[kasa-mcp] HTTP Server listening on http://${HTTP_HOST}:${HTTP_PORT}/mcp (stateful mode)`
    );
    console.error("[kasa-mcp] Test with: curl -X POST http://127.0.0.1:3000/mcp");
  });

  // Graceful shutdown
  process.on("SIGINT", async () => {
    console.error("[kasa-mcp] Shutting down HTTP server...");
    // Close all active sessions
    for (const [sessionId, session] of sessions) {
      try {
        await session.transport.close();
        await session.server.close();
      } catch (error) {
        console.error(`Error closing session ${sessionId}:`, error);
      }
    }
    server.close(() => {
      process.exit(0);
    });
  });
}

/**
 * Run in HTTP stateless mode.
 * Each request creates a new server instance (no state persistence).
 * Suitable for serverless and simple request/response scenarios.
 */
async function runHttpStateless(): Promise<void> {
  const app = createMcpExpressApp({ host: HTTP_HOST });

  // POST /mcp - Handle stateless requests
  app.post("/mcp", async (req: Request, res: Response) => {
    const server = createKasaServer();
    const transport = new StreamableHTTPServerTransport();

    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);

      res.on("close", () => {
        transport.close().catch((error) => {
          console.error("Error closing transport:", error);
        });
        server.close().catch((error) => {
          console.error("Error closing server:", error);
        });
      });
    } catch (error) {
      console.error("Error handling stateless request:", error);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: "2.0",
          error: { code: -32603, message: "Internal server error" },
          id: null,
        });
      }
    }
  });

  const server = app.listen(HTTP_PORT, HTTP_HOST, () => {
    console.error(
      `[kasa-mcp] HTTP Server listening on http://${HTTP_HOST}:${HTTP_PORT}/mcp (stateless mode)`
    );
    console.error(
      "[kasa-mcp] Note: Stateless mode does not support persistent sessions or SSE"
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

/**
 * Main entry point that detects transport mode and routes accordingly.
 */
async function main(): Promise<void> {
  console.error(`[kasa-mcp] Starting in ${TRANSPORT_MODE} mode...`);

  switch (TRANSPORT_MODE) {
    case "http":
      if (SESSION_MODE) {
        await runHttpStateful();
      } else {
        await runHttpStateless();
      }
      break;
    case "stdio":
    default:
      await runStdio();
      break;
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
