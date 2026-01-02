/**
 * get_device_info tool handler tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleGetDeviceInfo } from "../../../src/tools/get-device-info.js";
import { createToolContext, createMockDeviceManager, createMockDevice } from "../../fixtures/mock-device.js";

describe("handleGetDeviceInfo", () => {
  let context: ReturnType<typeof createToolContext>;
  let mockDeviceManager: ReturnType<typeof createMockDeviceManager>;
  let mockDevice: ReturnType<typeof createMockDevice>;

  beforeEach(() => {
    mockDevice = createMockDevice();
    mockDeviceManager = createMockDeviceManager({
      getDevice: vi.fn().mockResolvedValue(mockDevice),
    });
    context = createToolContext({ deviceManager: mockDeviceManager });
  });

  it("returns device information in expected format", async () => {
    mockDevice.getSysInfo.mockResolvedValue({
      deviceId: "device-123",
      alias: "Test Device",
      model: "HS110",
      hw_ver: "1.0",
      sw_ver: "1.0.0",
      mic_type: "plug",
      mac: "AA:BB:CC:DD:EE:FF",
    });
    mockDevice.getPowerState.mockResolvedValue(true);

    const result = await handleGetDeviceInfo({ host: "192.168.1.100" }, context);

    expect(result.content[0].type).toBe("text");
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.success).toBe(true);
    expect(parsed.deviceId).toBe("device-123");
    expect(parsed.alias).toBe("Test Device");
    expect(parsed.model).toBe("HS110");
    expect(parsed.powerState).toBe("on");
  });

  it("handles missing power state gracefully", async () => {
    mockDevice.getSysInfo.mockResolvedValue({
      deviceId: "device-123",
      alias: "Test Device",
      model: "HS110",
    });
    mockDevice.getPowerState.mockRejectedValue(new Error("Not supported"));

    const result = await handleGetDeviceInfo({ host: "192.168.1.100" }, context);

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.success).toBe(true);
    expect(parsed.powerState).toBe("unknown");
  });

  it("uses deviceId when provided", async () => {
    await handleGetDeviceInfo({ deviceId: "device-123" }, context);

    expect(mockDeviceManager.getDevice).toHaveBeenCalledWith(
      "device-123",
      undefined,
      expect.any(Number)
    );
  });

  it("uses host when provided", async () => {
    await handleGetDeviceInfo({ host: "192.168.1.100" }, context);

    expect(mockDeviceManager.getDevice).toHaveBeenCalledWith(
      undefined,
      "192.168.1.100",
      expect.any(Number)
    );
  });

  it("falls back to defaults for missing fields", async () => {
    // Create a device without alias property
    const deviceWithoutAlias = createMockDevice();
    delete (deviceWithoutAlias as any).alias;
    mockDeviceManager.getDevice.mockResolvedValue(deviceWithoutAlias as any);
    
    deviceWithoutAlias.getSysInfo.mockResolvedValue({
      deviceId: "device-123",
      // No alias, model, etc.
    });
    deviceWithoutAlias.getPowerState.mockRejectedValue(new Error("Not supported"));

    const result = await handleGetDeviceInfo({ host: "192.168.1.100" }, context);

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.alias).toBe("Unknown");
    expect(parsed.model).toBe("Unknown");
    expect(parsed.hwVer).toBe("Unknown");
    expect(parsed.swVer).toBe("Unknown");
    expect(parsed.type).toBe("Unknown");
    expect(parsed.macAddress).toBe("Unknown");
  });

  it("uses timeout from args when provided", async () => {
    await handleGetDeviceInfo({ host: "192.168.1.100", timeout: 15000 }, context);

    expect(mockDeviceManager.getDevice).toHaveBeenCalledWith(
      undefined,
      "192.168.1.100",
      15000
    );
  });

  it("uses default timeout from config when not provided", async () => {
    await handleGetDeviceInfo({ host: "192.168.1.100" }, context);

    expect(mockDeviceManager.getDevice).toHaveBeenCalledWith(
      undefined,
      "192.168.1.100",
      context.config.kasa.deviceTimeout
    );
  });

  it("returns power state as on when device is on", async () => {
    mockDevice.getSysInfo.mockResolvedValue({ deviceId: "device-123" });
    mockDevice.getPowerState.mockResolvedValue(true);

    const result = await handleGetDeviceInfo({ host: "192.168.1.100" }, context);

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.powerState).toBe("on");
  });

  it("returns power state as off when device is off", async () => {
    mockDevice.getSysInfo.mockResolvedValue({ deviceId: "device-123" });
    mockDevice.getPowerState.mockResolvedValue(false);

    const result = await handleGetDeviceInfo({ host: "192.168.1.100" }, context);

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.powerState).toBe("off");
  });
});

