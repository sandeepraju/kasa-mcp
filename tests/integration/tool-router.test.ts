/**
 * Tool router tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  KasaMCPError,
  KasaMCPErrorType,
} from "../../src/utils/errors.js";
import { executeTool } from "../../src/tools/index.js";
import {
  createToolContext,
  createMockDeviceManager,
} from "../fixtures/mock-device.js";

describe("executeTool", () => {
  let context: ReturnType<typeof createToolContext>;
  let mockDeviceManager: ReturnType<typeof createMockDeviceManager>;

  beforeEach(() => {
    mockDeviceManager = createMockDeviceManager();
    context = createToolContext({ deviceManager: mockDeviceManager });
  });

  it("routes known tools to correct handlers", async () => {
    const mockClient = mockDeviceManager.createDiscoveryClient();
    const mockDiscovery = {
      on: vi.fn(),
      stopDiscovery: vi.fn(),
    };
    vi.mocked(mockClient.startDiscovery).mockReturnValue(mockDiscovery as any);

    const result = await executeTool(
      "discover_devices",
      { timeout: 50 },
      context,
    );

    expect(result.content[0].type).toBe("text");
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.success).toBe(true);
  });

  it("returns error for unknown tools", async () => {
    const result = await executeTool("unknown_tool", {}, context);

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBe(true);
    expect(parsed.message).toContain("Unknown tool");
  });

  it("passes context to handlers correctly", async () => {
    const mockClient = mockDeviceManager.createDiscoveryClient();
    const mockDiscovery = {
      on: vi.fn(),
      stopDiscovery: vi.fn(),
    };
    vi.mocked(mockClient.startDiscovery).mockReturnValue(mockDiscovery as any);

    await executeTool("discover_devices", {}, context);

    // Verify that the handler used the context (deviceManager was called)
    expect(mockDeviceManager.createDiscoveryClient).toHaveBeenCalled();
  });

  it("error handling wraps handler errors appropriately", async () => {
    // Create a context with a device manager that throws
    const failingDeviceManager = createMockDeviceManager({
      getDevice: vi
        .fn()
        .mockRejectedValue(
          new KasaMCPError("Device not in cache", KasaMCPErrorType.DeviceNotFound),
        ),
    });
    const failingContext = createToolContext({
      deviceManager: failingDeviceManager,
    });

    const result = await executeTool(
      "get_device_info",
      { host: "192.168.1.100" },
      failingContext,
    );

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBe(true);
    expect(parsed.tool).toBe("get_device_info");
    expect(parsed.code).toBe(KasaMCPErrorType.DeviceNotFound);
    expect(parsed.message).toContain("Device not in cache");
    expect(parsed.suggestion).toContain("offline or unreachable");
  });

  it("tool execution errors are caught and formatted", async () => {
    const errorDeviceManager = createMockDeviceManager({
      getDevice: vi
        .fn()
        .mockRejectedValue(
          new KasaMCPError("Network timeout", KasaMCPErrorType.ConnectionTimeout),
        ),
    });
    const errorContext = createToolContext({ deviceManager: errorDeviceManager });

    const result = await executeTool(
      "set_power_state",
      { host: "192.168.1.100", state: true },
      errorContext,
    );

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBe(true);
    expect(parsed.code).toBe(KasaMCPErrorType.ConnectionTimeout);
    expect(parsed.suggestion).toContain("powered on");
  });
});


