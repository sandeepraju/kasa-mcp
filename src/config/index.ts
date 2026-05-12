/**
 * Configuration management for kasa-mcp
 * Centralizes all environment variable reading and provides typed configuration.
 *
 * Why Zod: parseInt/cast tricks produce NaN ports and silent unknown transport
 * modes. Fail fast at startup with a clear message instead of a mysterious
 * hang at runtime.
 */

import { z } from "zod";
import { KasaMCPError, KasaMCPErrorType } from "../utils/errors.js";

const DISCOVERY_DEVICE_TYPES = ["plug", "bulb"] as const;
type DeviceType = (typeof DISCOVERY_DEVICE_TYPES)[number];

const ConfigSchema = z.object({
  transport: z.object({
    mode: z
      .enum(["stdio", "http"])
      .default("stdio")
      .describe("MCP_TRANSPORT"),
    port: z
      .number()
      .int()
      .min(1)
      .max(65535)
      .default(3000)
      .describe("MCP_PORT"),
    host: z.string().min(1).default("127.0.0.1").describe("MCP_HOST"),
    sessionMode: z.boolean().default(true).describe("MCP_SESSION_MODE"),
  }),
  kasa: z.object({
    discoveryTimeout: z
      .number()
      .int()
      .min(100)
      .default(30000)
      .describe("KASA_DISCOVERY_TIMEOUT"),
    deviceTimeout: z
      .number()
      .int()
      .min(100)
      .default(30000)
      .describe("KASA_DEVICE_TIMEOUT"),
    deviceTypes: z
      .array(z.enum(DISCOVERY_DEVICE_TYPES))
      .default(["plug", "bulb"])
      .describe("KASA_DEVICE_TYPES (comma-separated)"),
  }),
});

export type Config = z.infer<typeof ConfigSchema>;

function parsePort(raw: string | undefined, defaultVal: number): number {
  if (!raw) return defaultVal;
  const n = parseInt(raw, 10);
  if (Number.isNaN(n)) {
    throw new KasaMCPError(
      `Invalid port "${raw}": must be an integer`,
      KasaMCPErrorType.ConfigInvalid
    );
  }
  return n;
}

function parseMs(raw: string | undefined, name: string, defaultVal: number): number {
  if (!raw) return defaultVal;
  const n = parseInt(raw, 10);
  if (Number.isNaN(n)) {
    throw new KasaMCPError(
      `Invalid ${name} "${raw}": must be an integer`,
      KasaMCPErrorType.ConfigInvalid
    );
  }
  return n;
}

function parseDeviceTypes(raw: string | undefined): DeviceType[] {
  if (!raw) return ["plug", "bulb"];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => DISCOVERY_DEVICE_TYPES.includes(s as DeviceType)) as DeviceType[];
}

/**
 * Load and validate configuration from environment variables.
 * Throws on invalid values so the process never starts in a broken state.
 */
export function loadConfig(): Config {
  const raw = {
    transport: {
      mode: (process.env.MCP_TRANSPORT || "stdio") as "stdio" | "http",
      port: parsePort(process.env.MCP_PORT, 3000),
      host: process.env.MCP_HOST || "127.0.0.1",
      sessionMode: process.env.MCP_SESSION_MODE !== "stateless",
    },
    kasa: {
      discoveryTimeout: parseMs(process.env.KASA_DISCOVERY_TIMEOUT, "KASA_DISCOVERY_TIMEOUT", 30000),
      deviceTimeout: parseMs(process.env.KASA_DEVICE_TIMEOUT, "KASA_DEVICE_TIMEOUT", 30000),
      deviceTypes: parseDeviceTypes(process.env.KASA_DEVICE_TYPES),
    },
  };

  const result = ConfigSchema.safeParse(raw);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new KasaMCPError(
      `Invalid configuration:\n${issues}`,
      KasaMCPErrorType.ConfigInvalid
    );
  }

  return result.data;
}
