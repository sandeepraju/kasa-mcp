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
  DiscoveryFailed = "DiscoveryFailed",
}

export class KasaMCPError extends Error {
  public code: KasaMCPErrorType;

  constructor(
    message: string,
    code: KasaMCPErrorType = KasaMCPErrorType.UnknownError,
  ) {
    super(message);
    this.name = "KasaMCPError";
    this.code = code;
  }
}
