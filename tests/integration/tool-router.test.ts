/**
 * Tool router tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { executeTool } from "../../src/tools/index.js";
import { createToolContext, createMockDeviceManager } from "../fixtures/mock-device.js";

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

    const result = await executeTool("discover_devices", { timeout: 50 }, context);

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
      getDevice: vi.fn().mockRejectedValue(new Error("Device error")),
    });
    const failingContext = createToolContext({ deviceManager: failingDeviceManager });

    const result = await executeTool("get_device_info", { host: "192.168.1.100" }, failingContext);

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBe(true);
    expect(parsed.tool).toBe("get_device_info");
    expect(parsed.message).toContain("Device error");
    expect(parsed.suggestion).toBeDefined();
  });

  it("tool execution errors are caught and formatted", async () => {
    const errorDeviceManager = createMockDeviceManager({
      getDevice: vi.fn().mockRejectedValue(new Error("Network timeout")),
    });
    const errorContext = createToolContext({ deviceManager: errorDeviceManager });

    const result = await executeTool("set_power_state", { host: "192.168.1.100", state: true }, errorContext);

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBe(true);
    expect(parsed.suggestion).toBeDefined();
  });
});

