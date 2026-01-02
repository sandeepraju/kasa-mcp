/**
 * Error handling utilities tests
 */

import { describe, it, expect } from "vitest";
import {
  getErrorSuggestion,
  createErrorResponse,
  createSuccessResponse,
} from "../../src/utils/error-handling.js";

describe("getErrorSuggestion", () => {
  it("returns timeout suggestion for timeout errors", () => {
    const error = new Error("ETIMEDOUT");
    const suggestion = getErrorSuggestion(error);
    expect(suggestion).toContain("powered on");
    expect(suggestion).toContain("same network");
  });

  it("returns timeout suggestion for timeout message", () => {
    const error = new Error("Request timeout");
    const suggestion = getErrorSuggestion(error);
    expect(suggestion).toContain("powered on");
  });

  it("returns unreachable suggestion for host unreachable errors", () => {
    const error = new Error("EHOSTUNREACH");
    const suggestion = getErrorSuggestion(error);
    expect(suggestion).toContain("offline");
    expect(suggestion).toContain("unreachable");
  });

  it("returns unreachable suggestion for network unreachable errors", () => {
    const error = new Error("ENETUNREACH");
    const suggestion = getErrorSuggestion(error);
    expect(suggestion).toContain("offline");
  });

  it("returns device not found suggestion for ENOENT errors", () => {
    const error = new Error("ENOENT");
    const suggestion = getErrorSuggestion(error);
    expect(suggestion).toContain("not found");
    expect(suggestion).toContain("discover_devices");
  });

  it("returns not supported suggestion for not support errors", () => {
    const error = new Error("This device does not support brightness control");
    const suggestion = getErrorSuggestion(error);
    expect(suggestion).toContain("not supported");
    expect(suggestion).toContain("device type");
  });

  it("returns generic suggestion for unknown errors", () => {
    const error = new Error("Some random error");
    const suggestion = getErrorSuggestion(error);
    expect(suggestion).toContain("device status");
    expect(suggestion).toContain("network connectivity");
  });
});

describe("createErrorResponse", () => {
  it("formats errors correctly", () => {
    const error = new Error("Test error message");
    const result = createErrorResponse("test_tool", error);

    expect(result.isError).toBe(true);
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe("text");

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBe(true);
    expect(parsed.tool).toBe("test_tool");
    expect(parsed.message).toBe("Test error message");
    expect(parsed.suggestion).toBeDefined();
    expect(typeof parsed.suggestion).toBe("string");
  });

  it("handles non-Error objects", () => {
    const error = "String error";
    const result = createErrorResponse("test_tool", error);

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.message).toBe("Unknown error");
    expect(parsed.suggestion).toBeDefined();
  });

  it("includes tool name in response", () => {
    const error = new Error("Error");
    const result = createErrorResponse("my_tool", error);

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.tool).toBe("my_tool");
  });
});

describe("createSuccessResponse", () => {
  it("formats success responses correctly", () => {
    const data = { success: true, value: 42 };
    const result = createSuccessResponse(data);

    expect(result.isError).toBeUndefined();
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe("text");

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.success).toBe(true);
    expect(parsed.value).toBe(42);
  });

  it("handles complex nested objects", () => {
    const data = {
      success: true,
      device: {
        id: "123",
        info: { name: "Test" },
      },
    };
    const result = createSuccessResponse(data);

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.device.id).toBe("123");
    expect(parsed.device.info.name).toBe("Test");
  });

  it("formats with proper indentation", () => {
    const data = { a: 1, b: 2 };
    const result = createSuccessResponse(data);

    // Should be formatted with indentation (null, 2)
    expect(result.content[0].text).toContain("\n");
  });
});

