/**
 * get_realtime_stats tool handler tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleGetRealtimeStats } from "../../../src/tools/get-realtime-stats.js";
import { createToolContext, createMockDeviceManager, createMockDevice } from "../../fixtures/mock-device.js";

describe("handleGetRealtimeStats", () => {
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

  it("returns energy stats in correct format", async () => {
    mockDevice.emeter.getRealtime.mockResolvedValue({
      power: 10.5,
      voltage: 120.0,
      current: 0.087,
      total_wh: 1000,
    });

    const result = await handleGetRealtimeStats({ host: "192.168.1.100" }, context);

    expect(result.content[0].type).toBe("text");
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.success).toBe(true);
    expect(parsed.power).toBe(10.5);
    expect(parsed.voltage).toBe(120.0);
    expect(parsed.current).toBe(0.087);
    expect(parsed.totalConsumption).toBe(1000);
    expect(parsed.unit).toEqual({
      power: "W",
      voltage: "V",
      current: "A",
      totalConsumption: "Wh",
    });
  });

  it("validates device supports energy monitoring", async () => {
    const deviceWithoutEmeter = createMockDevice();
    delete (deviceWithoutEmeter as any).emeter;
    mockDeviceManager.getDevice.mockResolvedValue(deviceWithoutEmeter as any);

    await expect(
      handleGetRealtimeStats({ host: "192.168.1.100" }, context)
    ).rejects.toThrow("does not support energy monitoring");
  });

  it("validates device has getRealtime method", async () => {
    const deviceWithoutMethod = createMockDevice();
    deviceWithoutMethod.emeter = {};
    mockDeviceManager.getDevice.mockResolvedValue(deviceWithoutMethod as any);

    await expect(
      handleGetRealtimeStats({ host: "192.168.1.100" }, context)
    ).rejects.toThrow("does not support energy monitoring");
  });

  it("handles missing stats gracefully", async () => {
    mockDevice.emeter.getRealtime.mockResolvedValue({});

    const result = await handleGetRealtimeStats({ host: "192.168.1.100" }, context);

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.power).toBe(0);
    expect(parsed.voltage).toBe(0);
    expect(parsed.current).toBe(0);
    expect(parsed.totalConsumption).toBe(0);
  });

  it("handles partial stats", async () => {
    mockDevice.emeter.getRealtime.mockResolvedValue({
      power: 5.0,
      // voltage, current, total_wh missing
    });

    const result = await handleGetRealtimeStats({ host: "192.168.1.100" }, context);

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.power).toBe(5.0);
    expect(parsed.voltage).toBe(0);
    expect(parsed.current).toBe(0);
    expect(parsed.totalConsumption).toBe(0);
  });

  it("handles errors from device gracefully", async () => {
    mockDevice.emeter.getRealtime.mockRejectedValue(new Error("Device error"));

    await expect(
      handleGetRealtimeStats({ host: "192.168.1.100" }, context)
    ).rejects.toThrow();
  });
});

