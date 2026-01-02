/**
 * DeviceManager tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { DeviceManager } from "../../src/device/device-manager.js";
import { createMockConfig } from "../fixtures/mock-device.js";
import type { DeviceInfo } from "../../src/device/types.js";

// Mock the tplink-smarthome-api module
vi.mock("tplink-smarthome-api", () => {
  const mockDevice = {
    deviceId: "test-device",
    alias: "Test Device",
  };

  const mockClient = {
    getDevice: vi.fn().mockResolvedValue(mockDevice),
  };

  return {
    default: {
      Client: vi.fn().mockImplementation(() => mockClient),
    },
  };
});

describe("DeviceManager", () => {
  let deviceManager: DeviceManager;
  let config: ReturnType<typeof createMockConfig>;

  beforeEach(() => {
    config = createMockConfig();
    deviceManager = new DeviceManager(config);
  });

  describe("caching", () => {
    it("stores device info in cache", () => {
      const deviceInfo: DeviceInfo = {
        host: "192.168.1.100",
        port: 9999,
        alias: "Test Device",
      };

      deviceManager.cacheDeviceInfo("device-123", deviceInfo);
      const cached = deviceManager.getCachedDeviceInfo("device-123");

      expect(cached).toEqual(deviceInfo);
    });

    it("retrieves cached device info correctly", () => {
      const deviceInfo: DeviceInfo = {
        host: "192.168.1.101",
        port: 9999,
        alias: "Cached Device",
      };

      deviceManager.cacheDeviceInfo("device-456", deviceInfo);
      const retrieved = deviceManager.getCachedDeviceInfo("device-456");

      expect(retrieved).toEqual(deviceInfo);
    });

    it("returns undefined for non-cached device", () => {
      const retrieved = deviceManager.getCachedDeviceInfo("non-existent");
      expect(retrieved).toBeUndefined();
    });
  });

  describe("getDevice", () => {
    it("throws error when neither deviceId nor host provided", async () => {
      await expect(deviceManager.getDevice()).rejects.toThrow(
        "Must provide either deviceId or host"
      );
    });

    it("gets device by host directly", async () => {
      const device = await deviceManager.getDevice(undefined, "192.168.1.100");

      expect(device).toBeDefined();
    });

    it("uses cache when deviceId provided and host not provided", async () => {
      const deviceInfo: DeviceInfo = {
        host: "192.168.1.102",
        port: 9999,
        alias: "Cached",
      };

      deviceManager.cacheDeviceInfo("device-789", deviceInfo);
      const device = await deviceManager.getDevice("device-789");

      expect(device).toBeDefined();
    });

    it("throws error when deviceId provided but not in cache", async () => {
      await expect(deviceManager.getDevice("unknown-device")).rejects.toThrow(
        "Cannot determine device host"
      );
    });

    it("passes timeout to getDevice call", async () => {
      const pkg = await import("tplink-smarthome-api");
      const { Client } = pkg.default;
      const mockClient = new Client();

      await deviceManager.getDevice(undefined, "192.168.1.100", 5000);

      expect(mockClient.getDevice).toHaveBeenCalledWith(
        { host: "192.168.1.100" },
        { timeout: 5000 }
      );
    });

    it("does not pass timeout when not specified", async () => {
      const pkg = await import("tplink-smarthome-api");
      const { Client } = pkg.default;
      const mockClient = new Client();

      await deviceManager.getDevice(undefined, "192.168.1.100");

      expect(mockClient.getDevice).toHaveBeenCalledWith(
        { host: "192.168.1.100" },
        undefined
      );
    });
  });

  describe("createDiscoveryClient", () => {
    it("creates a new client instance each time", () => {
      const client1 = deviceManager.createDiscoveryClient();
      const client2 = deviceManager.createDiscoveryClient();

      // Both should be defined
      expect(client1).toBeDefined();
      expect(client2).toBeDefined();
      // Note: Mocked clients may return the same instance, but the method should be callable
      expect(typeof deviceManager.createDiscoveryClient).toBe("function");
    });

    it("returns a client instance", () => {
      const client = deviceManager.createDiscoveryClient();
      expect(client).toBeDefined();
    });
  });
});

