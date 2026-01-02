/**
 * set_brightness tool handler tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleSetBrightness } from "../../../src/tools/set-brightness.js";
import { createToolContext, createMockDeviceManager, createMockDevice } from "../../fixtures/mock-device.js";

describe("handleSetBrightness", () => {
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

  it("sets brightness correctly", async () => {
    mockDevice.lighting.setLightState.mockResolvedValue(undefined);

    const result = await handleSetBrightness(
      { host: "192.168.1.100", brightness: 75 },
      context
    );

    expect(result.content[0].type).toBe("text");
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.success).toBe(true);
    expect(parsed.brightness).toBe(75);
    expect(parsed.message).toContain("Brightness set to 75%");
    expect(mockDevice.lighting.setLightState).toHaveBeenCalledWith(
      { brightness: 75 },
      expect.any(Object)
    );
  });

  it("validates device supports brightness", async () => {
    const deviceWithoutLighting = createMockDevice();
    delete (deviceWithoutLighting as any).lighting;
    mockDeviceManager.getDevice.mockResolvedValue(deviceWithoutLighting as any);

    await expect(
      handleSetBrightness({ host: "192.168.1.100", brightness: 50 }, context)
    ).rejects.toThrow("does not support brightness control");
  });

  it("validates device has setLightState method", async () => {
    const deviceWithoutMethod = createMockDevice();
    deviceWithoutMethod.lighting = {};
    mockDeviceManager.getDevice.mockResolvedValue(deviceWithoutMethod as any);

    await expect(
      handleSetBrightness({ host: "192.168.1.100", brightness: 50 }, context)
    ).rejects.toThrow("does not support brightness control");
  });

  it("returns confirmation with brightness value", async () => {
    mockDevice.lighting.setLightState.mockResolvedValue(undefined);

    const result = await handleSetBrightness(
      { deviceId: "device-123", brightness: 50 },
      context
    );

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.deviceId).toBe("device-123");
    expect(parsed.brightness).toBe(50);
  });

  it("handles errors from device gracefully", async () => {
    mockDevice.lighting.setLightState.mockRejectedValue(new Error("Device error"));

    await expect(
      handleSetBrightness({ host: "192.168.1.100", brightness: 50 }, context)
    ).rejects.toThrow();
  });
});

