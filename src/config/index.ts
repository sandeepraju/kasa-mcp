/**
 * Configuration management for kasa-mcp
 * Centralizes all environment variable reading and provides typed configuration
 */

export interface Config {
  transport: {
    mode: "stdio" | "http";
    port: number;
    host: string;
    sessionMode: boolean;
  };
  kasa: {
    discoveryTimeout: number;
    deviceTimeout: number;
  };
}

/**
 * Load configuration from environment variables
 */
export function loadConfig(): Config {
  return {
    transport: {
      mode: (process.env.MCP_TRANSPORT || "stdio") as "stdio" | "http",
      port: parseInt(process.env.MCP_PORT || "3000", 10),
      host: process.env.MCP_HOST || "127.0.0.1",
      sessionMode: process.env.MCP_SESSION_MODE !== "stateless",
    },
    kasa: {
      discoveryTimeout: parseInt(process.env.KASA_DISCOVERY_TIMEOUT || "30000", 10),
      deviceTimeout: parseInt(process.env.KASA_DEVICE_TIMEOUT || "30000", 10),
    },
  };
}


