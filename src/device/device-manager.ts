/**
 * Device manager for Kasa device operations
 * Encapsulates device caching, client management, and device lookup
 */

import { KasaMCPError, KasaMCPErrorType } from "../utils/errors.js";
import pkg from "tplink-smarthome-api";
import type { DeviceInfo, KasaClient, KasaDevice } from "./types.js";
import type { Config } from "../config/index.js";

const { Client } = pkg;

export class DeviceManager {
  private deviceInfoCache: Map<string, DeviceInfo>;
  private globalKasaClient: KasaClient | null;
  private config: Config;
  private disposed: boolean;

  constructor(config: Config) {
    this.deviceInfoCache = new Map();
    this.globalKasaClient = null;
    this.config = config;
    this.disposed = false;
  }

  /**
   * Gracefully shut down the device manager
   * - Closes the global Kasa client connection
   * - Clears the device info cache
   * - Prevents further operations
   */
  dispose(): void {
    if (this.disposed) {
      return;
    }

    if (this.globalKasaClient) {
      this.globalKasaClient.stopDiscovery();
      this.globalKasaClient = null;
    }

    this.deviceInfoCache.clear();
    this.disposed = true;
  }

  /**
   * Check if the device manager has been disposed
   * @throws Error if the manager is disposed
   */
  private checkDisposed(): void {
    if (this.disposed) {
      throw new KasaMCPError(
        "DeviceManager has been disposed.",
        KasaMCPErrorType.ManagerDisposed,
      );
    }
  }

  /**
   * Get or create the global Kasa client
   */
  private getGlobalClient(): KasaClient {
    this.checkDisposed();
    if (!this.globalKasaClient) {
      this.globalKasaClient = new Client();
    }
    return this.globalKasaClient;
  }

  /**
   * Cache device information for faster lookups
   */
  cacheDeviceInfo(deviceId: string, info: DeviceInfo): void {
    this.checkDisposed();
    this.deviceInfoCache.set(deviceId, info);
  }

  /**
   * Get cached device information
   */
  getCachedDeviceInfo(deviceId: string): DeviceInfo | undefined {
    this.checkDisposed();
    return this.deviceInfoCache.get(deviceId);
  }

  /**
   * Get device by ID or host
   * Always creates a fresh device connection (don't cache device objects)
   */
  async getDevice(
    deviceId?: string,
    host?: string,
    timeout?: number,
  ): Promise<KasaDevice> {
    this.checkDisposed();
    if (!deviceId && !host) {
      throw new KasaMCPError(
        "Must provide either deviceId or host",
        KasaMCPErrorType.InvalidArguments,
      );
    }

    // If only deviceId provided, try to look up host from cache
    if (deviceId && !host && this.deviceInfoCache.has(deviceId)) {
      const cached = this.deviceInfoCache.get(deviceId);
      host = cached!.host;
    }

    if (!host) {
      throw new KasaMCPError(
        "Cannot determine device host. Provide host or discover devices first.",
        KasaMCPErrorType.DeviceNotFound,
      );
    }

    // Build sendOptions if timeout is specified
    const sendOptions = timeout ? { timeout } : undefined;

    // Always get a fresh device connection from the global client
    return await this.getGlobalClient().getDevice({ host }, sendOptions);
  }

  /**
   * Create a new client instance for discovery operations
   * Discovery should use a fresh client to avoid state issues
   */
  createDiscoveryClient(): KasaClient {
    this.checkDisposed();
    return new Client();
  }
}

