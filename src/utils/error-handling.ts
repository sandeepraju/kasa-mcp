/**
 * Error handling utilities
 */

import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

/**
 * Helper function to get error suggestion based on error message
 */
export function getErrorSuggestion(error: Error): string {
  if (error.message.includes("timeout") || error.message.includes("ETIMEDOUT")) {
    return "Check that devices are powered on and on the same network as this server.";
  }
  if (error.message.includes("EHOSTUNREACH") || error.message.includes("ENETUNREACH")) {
    return "Device appears offline or unreachable. Check device power and network connectivity.";
  }
  if (error.message.includes("ENOENT")) {
    return "Device not found. Try running discover_devices first.";
  }
  if (error.message.includes("not support")) {
    return "This operation is not supported on this device type. Check device capabilities.";
  }
  return "Check device status, network connectivity, and ensure devices are on the same subnet.";
}

/**
 * Create an error response for tool execution
 */
export function createErrorResponse(
  toolName: string,
  error: unknown
): CallToolResult {
  const errorMessage = error instanceof Error ? error.message : "Unknown error";
  const errorObj = error instanceof Error ? error : new Error(String(error));
  
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify({
          error: true,
          tool: toolName,
          message: errorMessage,
          suggestion: getErrorSuggestion(errorObj),
        }, null, 2),
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

