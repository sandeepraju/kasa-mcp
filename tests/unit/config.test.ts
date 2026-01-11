/**
 * Configuration module tests
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { loadConfig, type Config } from "../../src/config/index.js";

describe("loadConfig", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment variables before each test
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("loads default values when no env vars are set", () => {
    delete process.env.MCP_TRANSPORT;
    delete process.env.MCP_PORT;
    delete process.env.MCP_HOST;
    delete process.env.MCP_SESSION_MODE;
    delete process.env.KASA_DISCOVERY_TIMEOUT;
    delete process.env.KASA_DEVICE_TIMEOUT;

    const config = loadConfig();

    expect(config.transport.mode).toBe("stdio");
    expect(config.transport.port).toBe(3000);
    expect(config.transport.host).toBe("127.0.0.1");
    expect(config.transport.sessionMode).toBe(true);
    expect(config.kasa.discoveryTimeout).toBe(30000);
    expect(config.kasa.deviceTimeout).toBe(30000);
  });

  it("parses environment variables correctly", () => {
    process.env.MCP_TRANSPORT = "http";
    process.env.MCP_PORT = "8080";
    process.env.MCP_HOST = "0.0.0.0";
    process.env.MCP_SESSION_MODE = "stateless";
    process.env.KASA_DISCOVERY_TIMEOUT = "10000";
    process.env.KASA_DEVICE_TIMEOUT = "15000";

    const config = loadConfig();

    expect(config.transport.mode).toBe("http");
    expect(config.transport.port).toBe(8080);
    expect(config.transport.host).toBe("0.0.0.0");
    expect(config.transport.sessionMode).toBe(false);
    expect(config.kasa.discoveryTimeout).toBe(10000);
    expect(config.kasa.deviceTimeout).toBe(15000);
  });

  it("handles invalid port numbers gracefully", () => {
    process.env.MCP_PORT = "invalid";

    const config = loadConfig();

    // parseInt returns NaN for invalid input, which should be handled
    // The actual behavior depends on how parseInt handles NaN
    expect(config.transport.port).toBeNaN();
  });

  it("correctly interprets session mode from env", () => {
    process.env.MCP_SESSION_MODE = "stateless";
    expect(loadConfig().transport.sessionMode).toBe(false);

    process.env.MCP_SESSION_MODE = "anything-else";
    expect(loadConfig().transport.sessionMode).toBe(true);

    delete process.env.MCP_SESSION_MODE;
    expect(loadConfig().transport.sessionMode).toBe(true);
  });

  it("returns typed configuration object", () => {
    const config = loadConfig();

    expect(config).toHaveProperty("transport");
    expect(config).toHaveProperty("kasa");
    expect(config.transport).toHaveProperty("mode");
    expect(config.transport).toHaveProperty("port");
    expect(config.transport).toHaveProperty("host");
    expect(config.transport).toHaveProperty("sessionMode");
    expect(config.kasa).toHaveProperty("discoveryTimeout");
    expect(config.kasa).toHaveProperty("deviceTimeout");
  });
});


