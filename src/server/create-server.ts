/**
 * MCP server factory
 * Creates and configures the MCP server instance
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { KasaMCPError, KasaMCPErrorType } from "../utils/errors.js";
import { TOOL_DEFINITIONS } from "./tool-definitions.js";
import { executeTool } from "../tools/index.js";
import type { ToolContext } from "../tools/discover-devices.js";

// Dynamically read version from package.json
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJsonPath = join(__dirname, "..", "..", "package.json");
const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
const { version } = packageJson;

/**
 * Create a configured MCP server instance
 */
export function createKasaServer(context: ToolContext): Server {
  const server = new Server(
    {
      name: "kasa-mcp",
      version: version,
    },
    {
      capabilities: {
        tools: {},
        resources: {},
      },
    },
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
    throw new KasaMCPError(
      `Resource not found: ${uri}`,
      KasaMCPErrorType.ResourceNotFound,
    );
  });

  return server;
}


