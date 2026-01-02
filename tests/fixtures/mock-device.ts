/**
 * Mock device factories and utilities for testing
 */

import { vi } from "vitest";
import type { DeviceManager } from "../../src/device/device-manager.js";
import type { Config } from "../../src/config/index.js";
import type { ToolContext } from "../../src/tools/discover-devices.js";

/**
 * Create a mock device object with common methods
 */
export function createMockDevice() {
  return {
    deviceId: "test-device-123",
    alias: "Test Device",
    getSysInfo: vi.fn().mockResolvedValue({
      deviceId: "test-device-123",
      alias: "Test Device",
      model: "HS110",
      hw_ver: "1.0",
      sw_ver: "1.0.0",
      mic_type: "plug",
      mac: "AA:BB:CC:DD:EE:FF",
    }),
    getPowerState: vi.fn().mockResolvedValue(true),
    setPowerState: vi.fn().mockResolvedValue(undefined),
    lighting: {
      setLightState: vi.fn().mockResolvedValue(undefined),
    },
    emeter: {
      getRealtime: vi.fn().mockResolvedValue({
        power: 10.5,
        voltage: 120.0,
        current: 0.087,
        total_wh: 1000,
      }),
    },
  };
}

/**
 * Create a mock Kasa Client
 */
export function createMockClient() {
  const mockDevice = createMockDevice();
  return {
    getDevice: vi.fn().mockResolvedValue(mockDevice),
    startDiscovery: vi.fn().mockReturnValue({
      on: vi.fn(),
      stopDiscovery: vi.fn(),
    }),
    stopDiscovery: vi.fn(),
  };
}

/**
 * Create a mock DeviceManager
 */
export function createMockDeviceManager(overrides?: Partial<DeviceManager>): DeviceManager {
  const mockClient = createMockClient();
  const mockDevice = createMockDevice();
  
  return {
    cacheDeviceInfo: vi.fn(),
    getCachedDeviceInfo: vi.fn().mockReturnValue(undefined),
    getDevice: vi.fn().mockResolvedValue(mockDevice),
    createDiscoveryClient: vi.fn().mockReturnValue(mockClient),
    ...overrides,
  } as unknown as DeviceManager;
}

/**
 * Create a mock configuration
 */
export function createMockConfig(overrides?: Partial<Config>): Config {
  return {
    transport: {
      mode: "stdio",
      port: 3000,
      host: "127.0.0.1",
      sessionMode: true,
    },
    kasa: {
      discoveryTimeout: 5000,
      deviceTimeout: 30000,
    },
    ...overrides,
  };
}

/**
 * Create a tool context for testing
 */
export function createToolContext(overrides?: Partial<ToolContext>): ToolContext {
  return {
    deviceManager: createMockDeviceManager(),
    config: createMockConfig(),
    ...overrides,
  };
}

