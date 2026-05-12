/**
 * Stdio transport mode (default, for Claude Desktop compatibility)
 */

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createKasaServer } from "../server/create-server.js";
import type { ToolContext } from "../tools/types.js";

export async function runStdio(
  context: ToolContext,
  signal: AbortSignal
): Promise<void> {
  const server = createKasaServer(context);
  const transport = new StdioServerTransport();

  transport.onerror = (error) => {
    console.error("[kasa-mcp] Transport error:", error);
  };

  await server.connect(transport);

  return new Promise<void>((resolve) => {
    signal.addEventListener("abort", () => {
      server
        .close()
        .catch((err) =>
          console.error("[kasa-mcp] Error closing stdio server:", err)
        )
        .finally(resolve);
    });
  });
}
