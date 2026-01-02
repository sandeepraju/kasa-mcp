/**
 * Device manager for Kasa device operations
 * Encapsulates device caching, client management, and device lookup
 */

import pkg from "tplink-smarthome-api";
import type { DeviceInfo } from "./types.js";
import type { Config } from "../config/index.js";

const { Client } = pkg;

export class DeviceManager {
  private deviceInfoCache: Map<string, DeviceInfo>;
  private globalKasaClient: InstanceType<typeof Client> | null;
  private config: Config;

  constructor(config: Config) {
    this.deviceInfoCache = new Map();
    this.globalKasaClient = null;
    this.config = config;
  }

  /**
   * Get or create the global Kasa client
   */
  private getGlobalClient(): InstanceType<typeof Client> {
    if (!this.globalKasaClient) {
      this.globalKasaClient = new Client();
    }
    return this.globalKasaClient;
  }

  /**
   * Cache device information for faster lookups
   */
  cacheDeviceInfo(deviceId: string, info: DeviceInfo): void {
    this.deviceInfoCache.set(deviceId, info);
  }

  /**
   * Get cached device information
   */
  getCachedDeviceInfo(deviceId: string): DeviceInfo | undefined {
    return this.deviceInfoCache.get(deviceId);
  }

  /**
   * Get device by ID or host
   * Always creates a fresh device connection (don't cache device objects)
   */
  async getDevice(deviceId?: string, host?: string, timeout?: number): Promise<ReturnType<InstanceType<typeof Client>["getDevice"]>> {
    if (!deviceId && !host) {
      throw new Error("Must provide either deviceId or host");
    }

    // If only deviceId provided, try to look up host from cache
    if (deviceId && !host && this.deviceInfoCache.has(deviceId)) {
      const cached = this.deviceInfoCache.get(deviceId);
      host = cached!.host;
    }

    if (!host) {
      throw new Error("Cannot determine device host. Provide host or discover devices first.");
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
  createDiscoveryClient(): InstanceType<typeof Client> {
    return new Client();
  }
}

