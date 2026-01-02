/**
 * MCP server factory
 * Creates and configures the MCP server instance
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { TOOL_DEFINITIONS } from "./tool-definitions.js";
import { executeTool } from "../tools/index.js";
import type { ToolContext } from "../tools/discover-devices.js";

/**
 * Create a configured MCP server instance
 */
export function createKasaServer(context: ToolContext): Server {
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
      tools: TOOL_DEFINITIONS,
    };
  });

  // Register tool call handler
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    return await executeTool(name, args, context);
  });

  // Register resource handlers
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

