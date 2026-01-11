/**
 * Schema validation tests
 */

import { describe, it, expect } from "vitest";
import {
  DiscoverDevicesSchema,
  GetDeviceInfoSchema,
  SetPowerStateSchema,
  SetBrightnessSchema,
  SetColorTemperatureSchema,
  GetRealtimeStatsSchema,
} from "../../src/schemas/index.js";

describe("DiscoverDevicesSchema", () => {
  it("accepts valid input with timeout", () => {
    const result = DiscoverDevicesSchema.safeParse({ timeout: 5000 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.timeout).toBe(5000);
    }
  });

  it("accepts valid input without timeout", () => {
    const result = DiscoverDevicesSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.timeout).toBeUndefined();
    }
  });

  it("rejects invalid timeout type", () => {
    const result = DiscoverDevicesSchema.safeParse({ timeout: "invalid" });
    expect(result.success).toBe(false);
  });
});

describe("GetDeviceInfoSchema", () => {
  it("accepts valid input with deviceId", () => {
    const result = GetDeviceInfoSchema.safeParse({ deviceId: "device-123" });
    expect(result.success).toBe(true);
  });

  it("accepts valid input with host", () => {
    const result = GetDeviceInfoSchema.safeParse({ host: "192.168.1.100" });
    expect(result.success).toBe(true);
  });

  it("accepts valid input with both deviceId and host", () => {
    const result = GetDeviceInfoSchema.safeParse({
      deviceId: "device-123",
      host: "192.168.1.100",
    });
    expect(result.success).toBe(true);
  });

  it("rejects input without deviceId or host", () => {
    const result = GetDeviceInfoSchema.safeParse({});
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("Either deviceId or host must be provided");
    }
  });

  it("accepts optional timeout", () => {
    const result = GetDeviceInfoSchema.safeParse({
      host: "192.168.1.100",
      timeout: 15000,
    });
    expect(result.success).toBe(true);
  });
});

describe("SetPowerStateSchema", () => {
  it("accepts valid input with state and deviceId", () => {
    const result = SetPowerStateSchema.safeParse({
      deviceId: "device-123",
      state: true,
    });
    expect(result.success).toBe(true);
  });

  it("accepts valid input with state and host", () => {
    const result = SetPowerStateSchema.safeParse({
      host: "192.168.1.100",
      state: false,
    });
    expect(result.success).toBe(true);
  });

  it("requires state field", () => {
    const result = SetPowerStateSchema.safeParse({
      deviceId: "device-123",
    });
    expect(result.success).toBe(false);
  });

  it("rejects input without deviceId or host", () => {
    const result = SetPowerStateSchema.safeParse({ state: true });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("Either deviceId or host must be provided");
    }
  });

  it("requires state to be boolean", () => {
    const result = SetPowerStateSchema.safeParse({
      host: "192.168.1.100",
      state: "on",
    });
    expect(result.success).toBe(false);
  });
});

describe("SetBrightnessSchema", () => {
  it("accepts valid input with brightness in range", () => {
    const result = SetBrightnessSchema.safeParse({
      host: "192.168.1.100",
      brightness: 50,
    });
    expect(result.success).toBe(true);
  });

  it("accepts brightness at minimum (0)", () => {
    const result = SetBrightnessSchema.safeParse({
      host: "192.168.1.100",
      brightness: 0,
    });
    expect(result.success).toBe(true);
  });

  it("accepts brightness at maximum (100)", () => {
    const result = SetBrightnessSchema.safeParse({
      host: "192.168.1.100",
      brightness: 100,
    });
    expect(result.success).toBe(true);
  });

  it("rejects brightness below minimum", () => {
    const result = SetBrightnessSchema.safeParse({
      host: "192.168.1.100",
      brightness: -1,
    });
    expect(result.success).toBe(false);
  });

  it("rejects brightness above maximum", () => {
    const result = SetBrightnessSchema.safeParse({
      host: "192.168.1.100",
      brightness: 101,
    });
    expect(result.success).toBe(false);
  });

  it("requires brightness field", () => {
    const result = SetBrightnessSchema.safeParse({
      host: "192.168.1.100",
    });
    expect(result.success).toBe(false);
  });
});

describe("SetColorTemperatureSchema", () => {
  it("accepts valid input with temperature in range", () => {
    const result = SetColorTemperatureSchema.safeParse({
      host: "192.168.1.100",
      temperature: 3000,
    });
    expect(result.success).toBe(true);
  });

  it("accepts temperature at minimum (2500)", () => {
    const result = SetColorTemperatureSchema.safeParse({
      host: "192.168.1.100",
      temperature: 2500,
    });
    expect(result.success).toBe(true);
  });

  it("accepts temperature at maximum (9000)", () => {
    const result = SetColorTemperatureSchema.safeParse({
      host: "192.168.1.100",
      temperature: 9000,
    });
    expect(result.success).toBe(true);
  });

  it("rejects temperature below minimum", () => {
    const result = SetColorTemperatureSchema.safeParse({
      host: "192.168.1.100",
      temperature: 2499,
    });
    expect(result.success).toBe(false);
  });

  it("rejects temperature above maximum", () => {
    const result = SetColorTemperatureSchema.safeParse({
      host: "192.168.1.100",
      temperature: 9001,
    });
    expect(result.success).toBe(false);
  });

  it("requires temperature field", () => {
    const result = SetColorTemperatureSchema.safeParse({
      host: "192.168.1.100",
    });
    expect(result.success).toBe(false);
  });
});

describe("GetRealtimeStatsSchema", () => {
  it("accepts valid input with deviceId", () => {
    const result = GetRealtimeStatsSchema.safeParse({ deviceId: "device-123" });
    expect(result.success).toBe(true);
  });

  it("accepts valid input with host", () => {
    const result = GetRealtimeStatsSchema.safeParse({ host: "192.168.1.100" });
    expect(result.success).toBe(true);
  });

  it("rejects input without deviceId or host", () => {
    const result = GetRealtimeStatsSchema.safeParse({});
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("Either deviceId or host must be provided");
    }
  });
});


