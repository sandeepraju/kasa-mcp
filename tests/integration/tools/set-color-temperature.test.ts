/**
 * set_color_temperature tool handler tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleSetColorTemperature } from "../../../src/tools/set-color-temperature.js";
import { createToolContext, createMockDeviceManager, createMockDevice } from "../../fixtures/mock-device.js";

describe("handleSetColorTemperature", () => {
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

  it("sets color temperature correctly", async () => {
    mockDevice.lighting.setLightState.mockResolvedValue(undefined);

    const result = await handleSetColorTemperature(
      { host: "192.168.1.100", temperature: 3000 },
      context
    );

    expect(result.content[0].type).toBe("text");
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.success).toBe(true);
    expect(parsed.colorTemperature).toBe(3000);
    expect(parsed.message).toContain("Color temperature set to 3000K");
    expect(mockDevice.lighting.setLightState).toHaveBeenCalledWith(
      { color_temp: 3000 },
      expect.any(Object)
    );
  });

  it("validates device supports color temperature", async () => {
    const deviceWithoutLighting = createMockDevice();
    delete (deviceWithoutLighting as any).lighting;
    mockDeviceManager.getDevice.mockResolvedValue(deviceWithoutLighting as any);

    await expect(
      handleSetColorTemperature({ host: "192.168.1.100", temperature: 3000 }, context)
    ).rejects.toThrow("does not support color temperature control");
  });

  it("validates device has setLightState method", async () => {
    const deviceWithoutMethod = createMockDevice();
    deviceWithoutMethod.lighting = {};
    mockDeviceManager.getDevice.mockResolvedValue(deviceWithoutMethod as any);

    await expect(
      handleSetColorTemperature({ host: "192.168.1.100", temperature: 3000 }, context)
    ).rejects.toThrow("does not support color temperature control");
  });

  it("returns confirmation with temperature value", async () => {
    mockDevice.lighting.setLightState.mockResolvedValue(undefined);

    const result = await handleSetColorTemperature(
      { deviceId: "device-123", temperature: 4000 },
      context
    );

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.deviceId).toBe("device-123");
    expect(parsed.colorTemperature).toBe(4000);
  });

  it("handles errors from device gracefully", async () => {
    mockDevice.lighting.setLightState.mockRejectedValue(new Error("Device error"));

    await expect(
      handleSetColorTemperature({ host: "192.168.1.100", temperature: 3000 }, context)
    ).rejects.toThrow();
  });
});


