/**
 * Error handling utilities
 */

import { ZodError } from "zod";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import {
  KasaMCPError,
  KasaMCPErrorType,
  type KasaMCPErrorDetails,
} from "./errors.js";

function classifyError(error: Error): KasaMCPErrorType {
  if (error instanceof KasaMCPError) {
    return error.code;
  }

  if (error instanceof ZodError) {
    return KasaMCPErrorType.InvalidArguments;
  }

  // Check the .code property that Node.js sets on ErrnoException — the tplink
  // library sometimes wraps errors so the code doesn't appear in the message.
  const errCode = (error as NodeJS.ErrnoException).code;

  if (errCode === "ETIMEDOUT") return KasaMCPErrorType.ConnectionTimeout;
  if (errCode === "EHOSTUNREACH" || errCode === "ENETUNREACH") return KasaMCPErrorType.NetworkError;
  if (errCode === "ECONNREFUSED" || errCode === "EADDRNOTAVAIL") return KasaMCPErrorType.ConnectionRefused;
  if (errCode === "ENOENT") return KasaMCPErrorType.DeviceNotFound;

  // Classify by normalized message so mixed-case messages from dependency
  // wrapping don't fall through to UnknownError.
  const msg = error.message.toLowerCase();

  if (
    msg.includes("timeout") ||
    msg.includes("timed out") ||
    msg.includes("etimedout")
  ) {
    return KasaMCPErrorType.ConnectionTimeout;
  }

  if (msg.includes("ehostunreach") || msg.includes("enetunreach")) {
    return KasaMCPErrorType.NetworkError;
  }

  if (msg.includes("econnrefused") || msg.includes("eaddrnotavail")) {
    return KasaMCPErrorType.ConnectionRefused;
  }

  if (msg.includes("enoent")) {
    return KasaMCPErrorType.DeviceNotFound;
  }

  return KasaMCPErrorType.UnknownError;
}

export function getErrorSuggestion(code: KasaMCPErrorType): string {
  switch (code) {
    case KasaMCPErrorType.ConnectionTimeout:
    case KasaMCPErrorType.NetworkError:
      return "Check that the device is powered on and connected to the same network as this server.";
    case KasaMCPErrorType.ConnectionRefused:
      return "The device is reachable but refused the connection. It may be busy or in an error state. Try power-cycling the device.";
    case KasaMCPErrorType.DeviceNotFound:
      return "Device appears offline or unreachable. You may need to run `discover_devices` again.";
    case KasaMCPErrorType.UnsupportedOperation:
      return "This operation is not supported by the device. Check the device's capabilities.";
    case KasaMCPErrorType.ManagerDisposed:
      return "The server is shutting down or has been restarted. Please try the request again.";
    case KasaMCPErrorType.InvalidArguments:
      return "The arguments provided to the tool were invalid. Please check the tool's documentation for required parameters.";
    case KasaMCPErrorType.ConfigInvalid:
      return "The server configuration is invalid. Check environment variables and restart.";
    default:
      return "An unknown error occurred. Check the server logs for more details.";
  }
}

function extractDetails(error: Error): KasaMCPErrorDetails | undefined {
  if (error instanceof KasaMCPError && error.details) {
    return error.details;
  }

  if (error instanceof ZodError) {
    const field = error.issues[0]?.path.join(".");
    return field ? { field } : undefined;
  }

  return undefined;
}

export function createErrorResponse(
  toolName: string,
  error: unknown
): CallToolResult {
  const errorObj = error instanceof Error ? error : new Error(String(error));
  const errorCode = classifyError(errorObj);
  const details = extractDetails(errorObj);

  const payload: Record<string, unknown> = {
    error: true,
    tool: toolName,
    code: errorCode,
    message: errorObj.message,
    suggestion: getErrorSuggestion(errorCode),
  };
  if (details) payload.details = details;

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(payload, null, 2),
      },
    ],
    isError: true,
  };
}

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
