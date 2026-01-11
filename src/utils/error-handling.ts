/**
 * Error handling utilities
 */

import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { KasaMCPError, KasaMCPErrorType } from "./errors.js";

/**
 * Maps an Error object to a KasaMCPErrorType.
 * This provides a bridge between generic errors (including from dependencies)
 * and the standardized error codes for this application.
 */
function classifyError(error: Error): KasaMCPErrorType {
  if (error instanceof KasaMCPError) {
    return error.code;
  }
  const lowerCaseMessage = error.message.toLowerCase();
  // Fallback for generic errors from dependencies
  if (
    lowerCaseMessage.includes("timeout") ||
    lowerCaseMessage.includes("timed out") ||
    error.message.includes("ETIMEDOUT")
  ) {
    return KasaMCPErrorType.ConnectionTimeout;
  }
  if (
    error.message.includes("EHOSTUNREACH") ||
    error.message.includes("ENETUNREACH")
  ) {
    return KasaMCPErrorType.NetworkError;
  }
  if (error.message.includes("ENOENT")) {
    return KasaMCPErrorType.DeviceNotFound;
  }
  return KasaMCPErrorType.UnknownError;
}

/**
 * Provides a user-friendly suggestion based on the error type.
 */
export function getErrorSuggestion(code: KasaMCPErrorType): string {
  switch (code) {
    case KasaMCPErrorType.ConnectionTimeout:
    case KasaMCPErrorType.NetworkError:
      return "Check that the device is powered on and connected to the same network as this server.";
    case KasaMCPErrorType.DeviceNotFound:
      return "Device appears offline or unreachable. You may need to run `discover_devices` again.";
    case KasaMCPErrorType.UnsupportedOperation:
      return "This operation is not supported by the device. Check the device's capabilities.";
    case KasaMCPErrorType.ManagerDisposed:
      return "The server is shutting down or has been restarted. Please try the request again.";
    case KasaMCPErrorType.InvalidArguments:
      return "The arguments provided to the tool were invalid. Please check the tool's documentation for required parameters.";
    default:
      return "An unknown error occurred. Check the server logs for more details.";
  }
}

/**
 * Create a structured error response for tool execution.
 */
export function createErrorResponse(
  toolName: string,
  error: unknown,
): CallToolResult {
  const errorObj = error instanceof Error ? error : new Error(String(error));
  const errorCode = classifyError(errorObj);
  const errorMessage = errorObj.message;

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(
          {
            error: true,
            tool: toolName,
            code: errorCode,
            message: errorMessage,
            suggestion: getErrorSuggestion(errorCode),
          },
          null,
          2,
        ),
      },
    ],
    isError: true,
  };
}

/**
 * Create a success response for tool execution
 */
export function createSuccessResponse(data: unknown): CallToolResult {
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(data, null, 2),
      },
    ],
  };
}

