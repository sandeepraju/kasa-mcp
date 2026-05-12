#!/usr/bin/env node

import { loadConfig } from "./config/index.js";
import { DeviceManager } from "./device/device-manager.js";
import { runStdio } from "./transport/stdio.js";
import { runHttpStateful } from "./transport/http-stateful.js";
import { runHttpStateless } from "./transport/http-stateless.js";
import type { ToolContext } from "./tools/types.js";

process.on("uncaughtException", (err) => {
  console.error("[kasa-mcp] Uncaught exception:", err);
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  console.error("[kasa-mcp] Unhandled promise rejection:", reason);
  process.exit(1);
});

async function main(): Promise<void> {
  const config = loadConfig();
  const deviceManager = new DeviceManager(config);
  const context: ToolContext = { deviceManager, config };

  // Single AbortController coordinates graceful shutdown across all transports.
  const controller = new AbortController();

  const shutdown = (signal: string) => {
    console.error(`\n[kasa-mcp] Received ${signal}, shutting down gracefully...`);
    deviceManager.dispose();
    controller.abort();
  };

  process.once("SIGINT", () => shutdown("SIGINT"));
  process.once("SIGTERM", () => shutdown("SIGTERM"));

  console.error(`[kasa-mcp] Starting in ${config.transport.mode} mode...`);

  switch (config.transport.mode) {
    case "http":
      if (config.transport.sessionMode) {
        await runHttpStateful(context, config, controller.signal);
      } else {
        await runHttpStateless(context, config, controller.signal);
      }
      break;
    case "stdio":
    default:
      await runStdio(context, controller.signal);
      break;
  }

  process.exit(0);
}

main().catch((error) => {
  console.error("[kasa-mcp] Fatal error:", error);
  process.exit(1);
});
