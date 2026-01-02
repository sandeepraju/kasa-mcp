/**
 * set_power_state tool handler tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleSetPowerState } from "../../../src/tools/set-power-state.js";
import { createToolContext, createMockDeviceManager, createMockDevice } from "../../fixtures/mock-device.js";

describe("handleSetPowerState", () => {
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

  it("turns device on when state is true", async () => {
    mockDevice.setPowerState.mockResolvedValue(undefined);
    mockDevice.getPowerState.mockResolvedValue(true);

    const result = await handleSetPowerState(
      { host: "192.168.1.100", state: true },
      context
    );

    expect(result.content[0].type).toBe("text");
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.success).toBe(true);
    expect(parsed.powerState).toBe("on");
    expect(parsed.message).toContain("turned on");
    expect(mockDevice.setPowerState).toHaveBeenCalledWith(true, expect.any(Object));
  });

  it("turns device off when state is false", async () => {
    mockDevice.setPowerState.mockResolvedValue(undefined);
    mockDevice.getPowerState.mockResolvedValue(false);

    const result = await handleSetPowerState(
      { host: "192.168.1.100", state: false },
      context
    );

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.success).toBe(true);
    expect(parsed.powerState).toBe("off");
    expect(parsed.message).toContain("turned off");
    expect(mockDevice.setPowerState).toHaveBeenCalledWith(false, expect.any(Object));
  });

  it("returns confirmation with new state", async () => {
    mockDevice.setPowerState.mockResolvedValue(undefined);
    mockDevice.getPowerState.mockResolvedValue(true);

    const result = await handleSetPowerState(
      { deviceId: "device-123", state: true },
      context
    );

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.deviceId).toBe("device-123");
    expect(parsed.powerState).toBe("on");
  });

  it("handles errors from device gracefully", async () => {
    mockDevice.setPowerState.mockRejectedValue(new Error("Device offline"));

    await expect(
      handleSetPowerState({ host: "192.168.1.100", state: true }, context)
    ).rejects.toThrow();
  });

  it("uses timeout from args when provided", async () => {
    mockDevice.setPowerState.mockResolvedValue(undefined);
    mockDevice.getPowerState.mockResolvedValue(true);

    await handleSetPowerState(
      { host: "192.168.1.100", state: true, timeout: 15000 },
      context
    );

    expect(mockDeviceManager.getDevice).toHaveBeenCalledWith(
      undefined,
      "192.168.1.100",
      15000
    );
  });

  it("uses deviceId when provided", async () => {
    mockDevice.setPowerState.mockResolvedValue(undefined);
    mockDevice.getPowerState.mockResolvedValue(true);

    await handleSetPowerState(
      { deviceId: "device-123", state: true },
      context
    );

    expect(mockDeviceManager.getDevice).toHaveBeenCalledWith(
      "device-123",
      undefined,
      expect.any(Number)
    );
  });
});

