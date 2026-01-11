/**
 * DeviceManager tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import * as TplinkApi from "tplink-smarthome-api";
import { DeviceManager } from "../../src/device/device-manager.js";
import { createMockConfig } from "../fixtures/mock-device.js";
import type { DeviceInfo } from "../../src/device/types.js";

// Mock the tplink-smarthome-api module
const mockDevice = {
  deviceId: "test-device",
  alias: "Test Device",
};

const mockClientInstance = {
  getDevice: vi.fn().mockResolvedValue(mockDevice),
  stopDiscovery: vi.fn(),
};

vi.mock("tplink-smarthome-api", () => ({
  default: {
    Client: vi.fn().mockImplementation(() => mockClientInstance),
  },
}));

describe("DeviceManager", () => {
  let deviceManager: DeviceManager;
  let config: ReturnType<typeof createMockConfig>;

  beforeEach(() => {
    vi.clearAllMocks();
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
        "Must provide either deviceId or host",
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
        "Cannot determine device host",
      );
    });

    it("passes timeout to getDevice call", async () => {
      await deviceManager.getDevice(undefined, "192.168.1.100", 5000);

      expect(mockClientInstance.getDevice).toHaveBeenCalledWith(
        { host: "192.168.1.100" },
        { timeout: 5000 },
      );
    });

    it("does not pass timeout when not specified", async () => {
      await deviceManager.getDevice(undefined, "192.168.1.100");

      expect(mockClientInstance.getDevice).toHaveBeenCalledWith(
        { host: "192.168.1.100" },
        undefined,
      );
    });
  });

  describe("createDiscoveryClient", () => {
    it("creates a new client instance each time", () => {
      const client1 = deviceManager.createDiscoveryClient();
      const client2 = deviceManager.createDiscoveryClient();

      expect(client1).toBeDefined();
      expect(client2).toBeDefined();
      expect(TplinkApi.default.Client).toHaveBeenCalledTimes(2);
    });

    it("returns a client instance", () => {
      const client = deviceManager.createDiscoveryClient();
      expect(client).toBeDefined();
    });
  });

  describe("dispose", () => {
    it("clears the cache and prevents future cache reads", () => {
      const deviceInfo: DeviceInfo = {
        host: "192.168.1.100",
        port: 9999,
        alias: "Test Device",
      };
      deviceManager.cacheDeviceInfo("device-123", deviceInfo);
      expect(deviceManager.getCachedDeviceInfo("device-123")).toBeDefined();

      deviceManager.dispose();

      expect(() => deviceManager.getCachedDeviceInfo("device-123")).toThrow(
        "DeviceManager has been disposed.",
      );
    });

    it("prevents further operations after being called", async () => {
      deviceManager.dispose();

      expect(() =>
        deviceManager.cacheDeviceInfo("test", {} as any),
      ).toThrow("DeviceManager has been disposed.");
      expect(() => deviceManager.getCachedDeviceInfo("test")).toThrow(
        "DeviceManager has been disposed.",
      );
      await expect(deviceManager.getDevice("test")).rejects.toThrow(
        "DeviceManager has been disposed.",
      );
      expect(() => deviceManager.createDiscoveryClient()).toThrow(
        "DeviceManager has been disposed.",
      );
    });

    it("calls stopDiscovery on the global client if it exists", async () => {
      // Prime the global client by calling a method that uses it
      await deviceManager.getDevice(undefined, "192.168.1.100");

      deviceManager.dispose();

      expect(mockClientInstance.stopDiscovery).toHaveBeenCalledTimes(1);
    });

    it("does not throw if disposed multiple times", () => {
      deviceManager.dispose();
      expect(() => deviceManager.dispose()).not.toThrow();
    });
  });
});

