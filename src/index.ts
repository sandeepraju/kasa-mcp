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
import pkg from "tplink-smarthome-api";
const { Client } = pkg;

// Configuration from environment variables
const TRANSPORT_MODE = process.env.MCP_TRANSPORT || "stdio";
const HTTP_PORT = parseInt(process.env.MCP_PORT || "3000", 10);
const HTTP_HOST = process.env.MCP_HOST || "127.0.0.1";
const SESSION_MODE = process.env.MCP_SESSION_MODE !== "stateless";
const KASA_DISCOVERY_TIMEOUT = parseInt(process.env.KASA_DISCOVERY_TIMEOUT || "30000", 10);
const KASA_DEVICE_TIMEOUT = parseInt(process.env.KASA_DEVICE_TIMEOUT || "30000", 10);

// Device info cache (store device info, not device objects)
const deviceInfoCache = new Map<string, { host: string; port: number; alias: string }>();

// Global client for device operations (not discovery)
let globalKasaClient: InstanceType<typeof Client> | null = null;

function getGlobalClient(): InstanceType<typeof Client> {
  if (!globalKasaClient) {
    globalKasaClient = new Client();
  }
  return globalKasaClient;
}

// Tool Schemas
const DiscoverDevicesSchema = z.object({
  timeout: z.number().optional().describe("Discovery timeout in milliseconds (default: 5000)"),
});

const GetDeviceInfoSchema = z.object({
  deviceId: z.string().optional().describe("Device ID from discovery"),
  host: z.string().optional().describe("Device IP address"),
  timeout: z.number().optional().describe("Operation timeout in milliseconds (default: 30000)"),
}).refine(data => data.deviceId || data.host, {
  message: "Either deviceId or host must be provided",
});

const SetPowerStateSchema = z.object({
  deviceId: z.string().optional().describe("Device ID from discovery"),
  host: z.string().optional().describe("Device IP address"),
  state: z.boolean().describe("true = on, false = off"),
  timeout: z.number().optional().describe("Operation timeout in milliseconds (default: 30000)"),
}).refine(data => data.deviceId || data.host, {
  message: "Either deviceId or host must be provided",
});

const SetBrightnessSchema = z.object({
  deviceId: z.string().optional().describe("Device ID from discovery"),
  host: z.string().optional().describe("Device IP address"),
  brightness: z.number().min(0).max(100).describe("Brightness percentage 0-100"),
  timeout: z.number().optional().describe("Operation timeout in milliseconds (default: 30000)"),
}).refine(data => data.deviceId || data.host, {
  message: "Either deviceId or host must be provided",
});

const SetColorTemperatureSchema = z.object({
  deviceId: z.string().optional().describe("Device ID from discovery"),
  host: z.string().optional().describe("Device IP address"),
  temperature: z.number().min(2500).max(9000).describe("Color temperature in Kelvin (2500-9000)"),
  timeout: z.number().optional().describe("Operation timeout in milliseconds (default: 30000)"),
}).refine(data => data.deviceId || data.host, {
  message: "Either deviceId or host must be provided",
});

const GetRealtimeStatsSchema = z.object({
  deviceId: z.string().optional().describe("Device ID from discovery"),
  host: z.string().optional().describe("Device IP address"),
  timeout: z.number().optional().describe("Operation timeout in milliseconds (default: 30000)"),
}).refine(data => data.deviceId || data.host, {
  message: "Either deviceId or host must be provided",
});

/**
 * Helper function to get error suggestion based on error message
 */
function getErrorSuggestion(error: Error): string {
  if (error.message.includes("timeout") || error.message.includes("ETIMEDOUT")) {
    return "Check that devices are powered on and on the same network as this server.";
  }
  if (error.message.includes("EHOSTUNREACH") || error.message.includes("ENETUNREACH")) {
    return "Device appears offline or unreachable. Check device power and network connectivity.";
  }
  if (error.message.includes("ENOENT")) {
    return "Device not found. Try running discover_devices first.";
  }
  if (error.message.includes("not support")) {
    return "This operation is not supported on this device type. Check device capabilities.";
  }
  return "Check device status, network connectivity, and ensure devices are on the same subnet.";
}

/**
 * Helper function to get device by ID or host
 * Always creates a fresh device connection (don't cache device objects)
 */
async function getDevice(deviceId?: string, host?: string, timeout?: number) {
  if (!deviceId && !host) {
    throw new Error("Must provide either deviceId or host");
  }

  // If only deviceId provided, try to look up host from cache
  if (deviceId && !host && deviceInfoCache.has(deviceId)) {
    const cached = deviceInfoCache.get(deviceId);
    host = cached!.host;
  }

  if (!host) {
    throw new Error("Cannot determine device host. Provide host or discover devices first.");
  }

  // Build sendOptions if timeout is specified
  const sendOptions = timeout ? { timeout } : undefined;

  // Always get a fresh device connection from the global client
  return await getGlobalClient().getDevice({ host }, sendOptions);
}

/**
 * Factory function to create a configured MCP server instance
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
          name: "discover_devices",
          description: "Discover Kasa smart home devices on the local network via UDP broadcast",
          inputSchema: {
            type: "object",
            properties: {
              timeout: {
                type: "number",
                description: "Discovery timeout in milliseconds (default: 5000)",
              },
            },
          },
        },
        {
          name: "get_device_info",
          description: "Get detailed information about a specific Kasa device",
          inputSchema: {
            type: "object",
            properties: {
              deviceId: {
                type: "string",
                description: "Device ID from discovery",
              },
              host: {
                type: "string",
                description: "Device IP address (e.g., 192.168.1.100)",
              },
              timeout: {
                type: "number",
                description: "Operation timeout in milliseconds (default: 30000)",
              },
            },
            anyOf: [
              { required: ["deviceId"] },
              { required: ["host"] },
            ],
          },
        },
        {
          name: "set_power_state",
          description: "Turn a Kasa device on or off",
          inputSchema: {
            type: "object",
            properties: {
              deviceId: {
                type: "string",
                description: "Device ID from discovery",
              },
              host: {
                type: "string",
                description: "Device IP address",
              },
              state: {
                type: "boolean",
                description: "true = on, false = off",
              },
              timeout: {
                type: "number",
                description: "Operation timeout in milliseconds (default: 30000)",
              },
            },
            required: ["state"],
            anyOf: [
              { required: ["state", "deviceId"] },
              { required: ["state", "host"] },
            ],
          },
        },
        {
          name: "set_brightness",
          description: "Set brightness level for Kasa smart bulbs (0-100%)",
          inputSchema: {
            type: "object",
            properties: {
              deviceId: {
                type: "string",
                description: "Device ID from discovery",
              },
              host: {
                type: "string",
                description: "Device IP address",
              },
              brightness: {
                type: "number",
                description: "Brightness percentage 0-100",
                minimum: 0,
                maximum: 100,
              },
              timeout: {
                type: "number",
                description: "Operation timeout in milliseconds (default: 30000)",
              },
            },
            required: ["brightness"],
            anyOf: [
              { required: ["brightness", "deviceId"] },
              { required: ["brightness", "host"] },
            ],
          },
        },
        {
          name: "set_color_temperature",
          description: "Set color temperature for Kasa color bulbs",
          inputSchema: {
            type: "object",
            properties: {
              deviceId: {
                type: "string",
                description: "Device ID from discovery",
              },
              host: {
                type: "string",
                description: "Device IP address",
              },
              temperature: {
                type: "number",
                description: "Color temperature in Kelvin (2500-9000)",
                minimum: 2500,
                maximum: 9000,
              },
              timeout: {
                type: "number",
                description: "Operation timeout in milliseconds (default: 30000)",
              },
            },
            required: ["temperature"],
            anyOf: [
              { required: ["temperature", "deviceId"] },
              { required: ["temperature", "host"] },
            ],
          },
        },
        {
          name: "get_realtime_stats",
          description: "Get real-time energy usage statistics for smart plugs",
          inputSchema: {
            type: "object",
            properties: {
              deviceId: {
                type: "string",
                description: "Device ID from discovery",
              },
              host: {
                type: "string",
                description: "Device IP address",
              },
              timeout: {
                type: "number",
                description: "Operation timeout in milliseconds (default: 30000)",
              },
            },
            anyOf: [
              { required: ["deviceId"] },
              { required: ["host"] },
            ],
          },
        },
      ],
    };
  });

  // Register tool call handler
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        case "discover_devices": {
          const timeout = (args as any).timeout || KASA_DISCOVERY_TIMEOUT;
          const devices: any[] = [];

          return new Promise((resolve) => {
            // Create a fresh client instance for each discovery
            // This avoids state issues from previous discoveries
            const discoveryClient = new Client();
            const discovery = discoveryClient.startDiscovery({ deviceTypes: ["plug", "bulb"] });

            discovery.on("device-new", (device: any) => {
              const deviceInfo = {
                deviceId: device.deviceId,
                alias: device.alias,
                type: device.deviceType,
                model: device.model,
                host: device.host,
                port: device.port,
              };
              devices.push(deviceInfo);
              // Cache device info (host, port, alias) for faster lookups
              deviceInfoCache.set(device.deviceId, {
                host: device.host,
                port: device.port,
                alias: device.alias,
              });
            });

            // Stop discovery after timeout
            const timer = setTimeout(() => {
              discoveryClient.stopDiscovery();
              resolve({
                content: [
                  {
                    type: "text",
                    text: JSON.stringify({
                      success: true,
                      count: devices.length,
                      devices: devices,
                      message: devices.length > 0
                        ? `Found ${devices.length} device(s)`
                        : "No devices found. Check that devices are powered on and on the same network.",
                    }),
                  },
                ],
              });
            }, timeout);
          });
        }

        case "get_device_info": {
          const args_typed = args as any;
          const timeout = args_typed.timeout || KASA_DEVICE_TIMEOUT;
          const sendOptions = { timeout };

          const device = await getDevice(args_typed.deviceId, args_typed.host, timeout);
          const deviceAny = device as any;
          const sysInfo = await deviceAny.getSysInfo(sendOptions) as any;

          // Get current power state
          let powerState = "unknown";
          try {
            const isOn = await deviceAny.getPowerState(sendOptions);
            powerState = isOn ? "on" : "off";
          } catch (e) {
            // Device might not support power state query
          }

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  success: true,
                  deviceId: (args_typed.deviceId || sysInfo.deviceId) as string,
                  alias: (sysInfo.alias || deviceAny.alias || "Unknown") as string,
                  model: (sysInfo.model || "Unknown") as string,
                  hwVer: (sysInfo.hw_ver || "Unknown") as string,
                  swVer: (sysInfo.sw_ver || "Unknown") as string,
                  type: (sysInfo.mic_type || "Unknown") as string,
                  macAddress: (sysInfo.mac || sysInfo.ethernet_mac || "Unknown") as string,
                  powerState: powerState,
                }, null, 2),
              },
            ],
          };
        }

        case "set_power_state": {
          const args_typed = args as any;
          const timeout = args_typed.timeout || KASA_DEVICE_TIMEOUT;
          const sendOptions = { timeout };

          const device = await getDevice(args_typed.deviceId, args_typed.host, timeout);
          const deviceAny = device as any;
          await deviceAny.setPowerState(args_typed.state, sendOptions);
          const newState = await deviceAny.getPowerState(sendOptions);

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  success: true,
                  deviceId: args_typed.deviceId || args_typed.host,
                  powerState: newState ? "on" : "off",
                  message: `Device turned ${newState ? "on" : "off"}`,
                }),
              },
            ],
          };
        }

        case "set_brightness": {
          const args_typed = args as any;
          const timeout = args_typed.timeout || KASA_DEVICE_TIMEOUT;
          const sendOptions = { timeout };

          const device = await getDevice(args_typed.deviceId, args_typed.host, timeout);
          const deviceAny = device as any;

          // Check if device supports brightness
          if (!deviceAny.lighting || !deviceAny.lighting.setLightState) {
            throw new Error("This device does not support brightness control");
          }

          await deviceAny.lighting.setLightState({ brightness: args_typed.brightness }, sendOptions);

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  success: true,
                  deviceId: args_typed.deviceId || args_typed.host,
                  brightness: args_typed.brightness,
                  message: `Brightness set to ${args_typed.brightness}%`,
                }),
              },
            ],
          };
        }

        case "set_color_temperature": {
          const args_typed = args as any;
          const timeout = args_typed.timeout || KASA_DEVICE_TIMEOUT;
          const sendOptions = { timeout };

          const device = await getDevice(args_typed.deviceId, args_typed.host, timeout);
          const deviceAny = device as any;

          // Check if device supports color temperature
          if (!deviceAny.lighting || !deviceAny.lighting.setLightState) {
            throw new Error("This device does not support color temperature control");
          }

          await deviceAny.lighting.setLightState({ color_temp: args_typed.temperature }, sendOptions);

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  success: true,
                  deviceId: args_typed.deviceId || args_typed.host,
                  colorTemperature: args_typed.temperature,
                  message: `Color temperature set to ${args_typed.temperature}K`,
                }),
              },
            ],
          };
        }

        case "get_realtime_stats": {
          const args_typed = args as any;
          const timeout = args_typed.timeout || KASA_DEVICE_TIMEOUT;
          const sendOptions = { timeout };

          const device = await getDevice(args_typed.deviceId, args_typed.host, timeout);
          const deviceAny = device as any;

          // Check if device supports energy monitoring
          if (!deviceAny.emeter || !deviceAny.emeter.getRealtime) {
            throw new Error("This device does not support energy monitoring");
          }

          const stats = await deviceAny.emeter.getRealtime(sendOptions) as any;

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  success: true,
                  deviceId: args_typed.deviceId || args_typed.host,
                  power: (stats.power || 0) as number,
                  voltage: (stats.voltage || 0) as number,
                  current: (stats.current || 0) as number,
                  totalConsumption: (stats.total_wh || 0) as number,
                  unit: {
                    power: "W",
                    voltage: "V",
                    current: "A",
                    totalConsumption: "Wh",
                  },
                }, null, 2),
              },
            ],
          };
        }

        default:
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  error: true,
                  message: `Unknown tool: ${name}`,
                }),
              },
            ],
            isError: true,
          };
      }
    } catch (error: any) {
      console.error(`[kasa-mcp] Tool error for ${name}:`, error);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              error: true,
              tool: name,
              message: error.message || "Unknown error",
              suggestion: getErrorSuggestion(error),
            }, null, 2),
          },
        ],
        isError: true,
      };
    }
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

/**
 * Run in stdio mode (default, for Claude Desktop compatibility)
 */
async function runStdio(): Promise<void> {
  const server = createKasaServer();
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

/**
 * Run in HTTP stateful mode with session management
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

  const server = app.listen(HTTP_PORT, HTTP_HOST, () => {
    console.error(
      `[kasa-mcp] HTTP Server listening on http://${HTTP_HOST}:${HTTP_PORT}/mcp (stateful mode)`
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

/**
 * Run in HTTP stateless mode
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
          console.error("[kasa-mcp] Error closing transport:", error);
        });
        server.close().catch((error) => {
          console.error("[kasa-mcp] Error closing server:", error);
        });
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

  const server = app.listen(HTTP_PORT, HTTP_HOST, () => {
    console.error(
      `[kasa-mcp] HTTP Server listening on http://${HTTP_HOST}:${HTTP_PORT}/mcp (stateless mode)`
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
 * Main entry point
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
  console.error("[kasa-mcp] Fatal error:", error);
  process.exit(1);
});
