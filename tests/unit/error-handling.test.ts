/**
 * Error handling utilities tests
 */

import { describe, it, expect } from "vitest";
import {
  KasaMCPError,
  KasaMCPErrorType,
} from "../../src/utils/errors.js";
import {
  getErrorSuggestion,
  createErrorResponse,
  createSuccessResponse,
} from "../../src/utils/error-handling.js";

describe("getErrorSuggestion", () => {
  it("returns correct suggestion for ConnectionTimeout", () => {
    const suggestion = getErrorSuggestion(KasaMCPErrorType.ConnectionTimeout);
    expect(suggestion).toContain("powered on");
  });

  it("returns correct suggestion for NetworkError", () => {
    const suggestion = getErrorSuggestion(KasaMCPErrorType.NetworkError);
    expect(suggestion).toContain("powered on");
  });

  it("returns correct suggestion for DeviceNotFound", () => {
    const suggestion = getErrorSuggestion(KasaMCPErrorType.DeviceNotFound);
    expect(suggestion).toContain("offline or unreachable");
  });

  it("returns correct suggestion for UnsupportedOperation", () => {
    const suggestion = getErrorSuggestion(KasaMCPErrorType.UnsupportedOperation);
    expect(suggestion).toContain("not supported by the device");
  });

  it("returns correct suggestion for ManagerDisposed", () => {
    const suggestion = getErrorSuggestion(KasaMCPErrorType.ManagerDisposed);
    expect(suggestion).toContain("shutting down or has been restarted");
  });

  it("returns correct suggestion for InvalidArguments", () => {
    const suggestion = getErrorSuggestion(KasaMCPErrorType.InvalidArguments);
    expect(suggestion).toContain("arguments provided to the tool were invalid");
  });

  it("returns generic suggestion for UnknownError", () => {
    const suggestion = getErrorSuggestion(KasaMCPErrorType.UnknownError);
    expect(suggestion).toContain("unknown error occurred");
  });
});

describe("createErrorResponse", () => {
  it("formats KasaMCPError correctly", () => {
    const error = new KasaMCPError(
      "Test Kasa Error",
      KasaMCPErrorType.DeviceNotFound,
    );
    const result = createErrorResponse("test_tool", error);
    const parsed = JSON.parse(result.content[0].text);

    expect(result.isError).toBe(true);
    expect(parsed.error).toBe(true);
    expect(parsed.tool).toBe("test_tool");
    expect(parsed.code).toBe(KasaMCPErrorType.DeviceNotFound);
    expect(parsed.message).toBe("Test Kasa Error");
    expect(parsed.suggestion).toContain("offline or unreachable");
  });

  it("classifies and formats generic timeout Error correctly", () => {
    const error = new Error("Request timed out");
    const result = createErrorResponse("test_tool", error);
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.code).toBe(KasaMCPErrorType.ConnectionTimeout);
    expect(parsed.message).toBe("Request timed out");
    expect(parsed.suggestion).toContain("powered on");
  });

  it("classifies and formats generic unreachable Error correctly", () => {
    const error = new Error("EHOSTUNREACH");
    const result = createErrorResponse("test_tool", error);
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.code).toBe(KasaMCPErrorType.NetworkError);
    expect(parsed.suggestion).toContain("powered on");
  });

  it("handles non-Error objects", () => {
    const error = "A string error";
    const result = createErrorResponse("test_tool", error);
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.message).toBe("A string error");
    expect(parsed.code).toBe(KasaMCPErrorType.UnknownError);
    expect(parsed.suggestion).toContain("unknown error occurred");
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
});


