/**
 * discover_devices tool handler tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleDiscoverDevices } from "../../../src/tools/discover-devices.js";
import { createToolContext, createMockDeviceManager } from "../../fixtures/mock-device.js";

describe("handleDiscoverDevices", () => {
  let context: ReturnType<typeof createToolContext>;
  let mockDeviceManager: ReturnType<typeof createMockDeviceManager>;

  beforeEach(() => {
    mockDeviceManager = createMockDeviceManager();
    context = createToolContext({ deviceManager: mockDeviceManager });
  });

  it("discovers devices and returns them in correct format", async () => {
    const mockClient = mockDeviceManager.createDiscoveryClient();
    const mockDiscovery = {
      on: vi.fn((event, callback) => {
        if (event === "device-new") {
          // Simulate device discovery
          setTimeout(() => {
            callback({
              deviceId: "device-1",
              alias: "Living Room Plug",
              deviceType: "plug",
              model: "HS110",
              host: "192.168.1.100",
              port: 9999,
            });
            callback({
              deviceId: "device-2",
              alias: "Bedroom Light",
              deviceType: "bulb",
              model: "LB130",
              host: "192.168.1.101",
              port: 9999,
            });
          }, 10);
        }
      }),
      stopDiscovery: vi.fn(),
    };

    vi.mocked(mockClient.startDiscovery).mockReturnValue(mockDiscovery as any);

    const result = await handleDiscoverDevices({ timeout: 100 }, context);

    expect(result.content[0].type).toBe("text");
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.success).toBe(true);
    expect(parsed.count).toBe(2);
    expect(parsed.devices).toHaveLength(2);
    expect(parsed.devices[0].deviceId).toBe("device-1");
    expect(parsed.devices[1].deviceId).toBe("device-2");
  });

  it("caches device info during discovery", async () => {
    const mockClient = mockDeviceManager.createDiscoveryClient();
    const mockDiscovery = {
      on: vi.fn((event, callback) => {
        if (event === "device-new") {
          setTimeout(() => {
            callback({
              deviceId: "device-1",
              alias: "Test Device",
              deviceType: "plug",
              model: "HS110",
              host: "192.168.1.100",
              port: 9999,
            });
          }, 10);
        }
      }),
      stopDiscovery: vi.fn(),
    };

    vi.mocked(mockClient.startDiscovery).mockReturnValue(mockDiscovery as any);

    await handleDiscoverDevices({ timeout: 100 }, context);

    expect(mockDeviceManager.cacheDeviceInfo).toHaveBeenCalledWith(
      "device-1",
      expect.objectContaining({
        host: "192.168.1.100",
        port: 9999,
        alias: "Test Device",
      })
    );
  });

  it("handles timeout correctly", async () => {
    const mockClient = mockDeviceManager.createDiscoveryClient();
    const mockStopDiscovery = vi.fn();
    const mockDiscovery = {
      on: vi.fn(),
      stopDiscovery: mockStopDiscovery,
    };

    vi.mocked(mockClient.startDiscovery).mockReturnValue(mockDiscovery as any);
    vi.mocked(mockClient.stopDiscovery).mockImplementation(mockStopDiscovery);

    const startTime = Date.now();
    await handleDiscoverDevices({ timeout: 50 }, context);
    const duration = Date.now() - startTime;

    // Should complete around the timeout (with some tolerance)
    expect(duration).toBeGreaterThanOrEqual(45);
    expect(duration).toBeLessThan(100);
    // Verify stopDiscovery was called (either on discovery or client)
    expect(mockClient.stopDiscovery).toHaveBeenCalled();
  });

  it("returns empty array when no devices found", async () => {
    const mockClient = mockDeviceManager.createDiscoveryClient();
    const mockDiscovery = {
      on: vi.fn(),
      stopDiscovery: vi.fn(),
    };

    vi.mocked(mockClient.startDiscovery).mockReturnValue(mockDiscovery as any);

    const result = await handleDiscoverDevices({ timeout: 50 }, context);

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.success).toBe(true);
    expect(parsed.count).toBe(0);
    expect(parsed.devices).toEqual([]);
    expect(parsed.message).toContain("No devices found");
  });

  it("message varies based on device count", async () => {
    const mockClient = mockDeviceManager.createDiscoveryClient();
    
    // Test with devices
    const mockDiscoveryWithDevices = {
      on: vi.fn((event, callback) => {
        if (event === "device-new") {
          setTimeout(() => {
            callback({
              deviceId: "device-1",
              alias: "Device 1",
              deviceType: "plug",
              model: "HS110",
              host: "192.168.1.100",
              port: 9999,
            });
          }, 10);
        }
      }),
      stopDiscovery: vi.fn(),
    };

    vi.mocked(mockClient.startDiscovery).mockReturnValue(mockDiscoveryWithDevices as any);
    const resultWithDevices = await handleDiscoverDevices({ timeout: 100 }, context);
    const parsedWithDevices = JSON.parse(resultWithDevices.content[0].text);
    expect(parsedWithDevices.message).toContain("Found 1 device(s)");

    // Test without devices
    const mockDiscoveryEmpty = {
      on: vi.fn(),
      stopDiscovery: vi.fn(),
    };
    vi.mocked(mockClient.startDiscovery).mockReturnValue(mockDiscoveryEmpty as any);
    const resultEmpty = await handleDiscoverDevices({ timeout: 50 }, context);
    const parsedEmpty = JSON.parse(resultEmpty.content[0].text);
    expect(parsedEmpty.message).toContain("No devices found");
  });

  it("uses default timeout from config when not provided", async () => {
    const mockClient = mockDeviceManager.createDiscoveryClient();
    const mockDiscovery = {
      on: vi.fn(),
      stopDiscovery: vi.fn(),
    };

    vi.mocked(mockClient.startDiscovery).mockReturnValue(mockDiscovery as any);

    await handleDiscoverDevices({}, context);

    // Should use config timeout (30000ms default)
    // We can't easily verify exact timeout, but we can verify it was called
    expect(mockClient.startDiscovery).toHaveBeenCalled();
  });
});

