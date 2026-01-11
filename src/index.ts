#!/usr/bin/env node

/**
 * Main entry point for kasa-mcp
 * Minimal orchestration layer that wires up modular components
 */

import { loadConfig } from "./config/index.js";
import { DeviceManager } from "./device/device-manager.js";
import { runStdio } from "./transport/stdio.js";
import { runHttpStateful } from "./transport/http-stateful.js";
import { runHttpStateless } from "./transport/http-stateless.js";
import type { ToolContext } from "./tools/discover-devices.js";

/**
 * Main entry point
 */
async function main(): Promise<void> {
  const config = loadConfig();
  const deviceManager = new DeviceManager(config);
  const context: ToolContext = {
    deviceManager,
    config,
  };

  // Graceful shutdown
  const cleanup = (): void => {
    console.error("\n[kasa-mcp] Shutting down gracefully...");
    deviceManager.dispose();
    process.exit(0);
  };

  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);

  console.error(`[kasa-mcp] Starting in ${config.transport.mode} mode...`);

  switch (config.transport.mode) {
    case "http":
      if (config.transport.sessionMode) {
        await runHttpStateful(context, config);
      } else {
        await runHttpStateless(context, config);
      }
      break;
    case "stdio":
    default:
      await runStdio(context);
      break;
  }
}

main().catch((error) => {
  console.error("[kasa-mcp] Fatal error:", error);
  process.exit(1);
});
