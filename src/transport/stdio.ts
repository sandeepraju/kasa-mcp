/**
 * Stdio transport mode (default, for Claude Desktop compatibility)
 */

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createKasaServer } from "../server/create-server.js";
import type { ToolContext } from "../tools/discover-devices.js";

export async function runStdio(context: ToolContext): Promise<void> {
  const server = createKasaServer(context);
  const transport = new StdioServerTransport();
  await server.connect(transport);

  // Error handling
  transport.onerror = (error) => {
    console.error("[kasa-mcp] Error:", error);
  };

  process.on("SIGINT", async () => {
    await server.close();
    process.exit(0);
  });
}


