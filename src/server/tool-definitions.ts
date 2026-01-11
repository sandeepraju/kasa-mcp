/**
 * Tool definitions (metadata) for MCP server
 * Separates tool schema definitions from implementations
 */

import type { Tool } from "@modelcontextprotocol/sdk/types.js";

export const TOOL_DEFINITIONS: Tool[] = [
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
];


