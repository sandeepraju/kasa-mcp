/**
 * Custom error types for kasa-mcp
 */

export enum KasaMCPErrorType {
  UnknownError = "UnknownError",
  ManagerDisposed = "ManagerDisposed",
  InvalidArguments = "InvalidArguments",
  DeviceNotFound = "DeviceNotFound",
  UnsupportedOperation = "UnsupportedOperation",
  ResourceNotFound = "ResourceNotFound",
  NetworkError = "NetworkError",
  ConnectionTimeout = "ConnectionTimeout",
  ConnectionRefused = "ConnectionRefused",
  ConfigInvalid = "ConfigInvalid",
}

/**
 * Optional structured details attached to an error response.
 * Lets callers correlate a failure with the device, host, or request
 * that produced it without fishing through log files.
 */
export interface KasaMCPErrorDetails {
  deviceId?: string;
  host?: string;
  model?: string;
  field?: string;
  [key: string]: unknown;
}

export class KasaMCPError extends Error {
  public readonly code: KasaMCPErrorType;
  public readonly details?: KasaMCPErrorDetails;

  constructor(
    message: string,
    code: KasaMCPErrorType = KasaMCPErrorType.UnknownError,
    details?: KasaMCPErrorDetails,
  ) {
    super(message);
    this.name = "KasaMCPError";
    this.code = code;
    this.details = details;
  }
}
