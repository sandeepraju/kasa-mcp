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
   * Gracefully shut down the device manager.
   * Idempotent — safe to call multiple times.
   */
  dispose(): void {
    if (this.disposed) {
      return;
    }

    // Mark disposed first so concurrent getDevice calls that just passed
    // checkDisposed() will still operate on a valid client, but no new
    // operations can start after this point.
    this.disposed = true;

    if (this.globalKasaClient) {
      try {
        this.globalKasaClient.stopDiscovery();
      } catch {
        // Ignore cleanup errors during shutdown
      }
      this.globalKasaClient = null;
    }

    this.deviceInfoCache.clear();
  }

  private checkDisposed(): void {
    if (this.disposed) {
      throw new KasaMCPError(
        "DeviceManager has been disposed.",
        KasaMCPErrorType.ManagerDisposed,
      );
    }
  }

  /**
   * Return the shared Kasa client, creating it on first use.
   *
   * Node.js is single-threaded: the client is created synchronously, so
   * concurrent async callers that all see `null` on entry are impossible
   * within the same turn of the event loop. A dispose() race is guarded
   * by setting `this.disposed = true` before clearing the client.
   */
  private getGlobalClient(): KasaClient {
    this.checkDisposed();
    if (!this.globalKasaClient) {
      this.globalKasaClient = new Client();
    }
    return this.globalKasaClient;
  }

  cacheDeviceInfo(deviceId: string, info: DeviceInfo): void {
    this.checkDisposed();
    this.deviceInfoCache.set(deviceId, info);
  }

  getCachedDeviceInfo(deviceId: string): DeviceInfo | undefined {
    this.checkDisposed();
    return this.deviceInfoCache.get(deviceId);
  }

  /**
   * Get device by ID or host.
   * Always creates a fresh device connection — device objects are never cached.
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

    if (deviceId && !host) {
      const cached = this.deviceInfoCache.get(deviceId);
      if (cached) host = cached.host;
    }

    if (!host) {
      throw new KasaMCPError(
        "Cannot determine device host. Provide host or discover devices first.",
        KasaMCPErrorType.DeviceNotFound,
        { deviceId },
      );
    }

    const sendOptions = timeout ? { timeout } : undefined;
    return await this.getGlobalClient().getDevice({ host }, sendOptions);
  }

  /**
   * Create a new client instance for discovery operations.
   * Discovery uses a fresh client to avoid state issues from previous runs.
   */
  createDiscoveryClient(): KasaClient {
    this.checkDisposed();
    return new Client();
  }
}
