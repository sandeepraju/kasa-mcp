/**
 * discover_devices tool handler
 */

import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { DiscoverDevicesSchema } from "../schemas/index.js";
import type { DeviceManager } from "../device/device-manager.js";
import type { Config } from "../config/index.js";
import type { DiscoveredDevice } from "../device/types.js";
import { createSuccessResponse } from "../utils/error-handling.js";

export interface ToolContext {
  deviceManager: DeviceManager;
  config: Config;
}

export async function handleDiscoverDevices(
  args: unknown,
  context: ToolContext
): Promise<CallToolResult> {
  const validatedArgs = DiscoverDevicesSchema.parse(args || {});
  const timeout = validatedArgs.timeout || context.config.kasa.discoveryTimeout;
  const devices: DiscoveredDevice[] = [];

  return new Promise((resolve) => {
    // Create a fresh client instance for each discovery
    // This avoids state issues from previous discoveries
    const discoveryClient = context.deviceManager.createDiscoveryClient();
    const discovery = discoveryClient.startDiscovery({ deviceTypes: ["plug", "bulb"] });

    discovery.on("device-new", (device: {
      deviceId: string;
      alias: string;
      deviceType: string;
      model: string;
      host: string;
      port: number;
    }) => {
      const deviceInfo: DiscoveredDevice = {
        deviceId: device.deviceId,
        alias: device.alias,
        type: device.deviceType,
        model: device.model,
        host: device.host,
        port: device.port,
      };
      devices.push(deviceInfo);
      // Cache device info (host, port, alias) for faster lookups
      context.deviceManager.cacheDeviceInfo(device.deviceId, {
        host: device.host,
        port: device.port,
        alias: device.alias,
      });
    });

    // Stop discovery after timeout
    setTimeout(() => {
      discoveryClient.stopDiscovery();
      resolve(createSuccessResponse({
        success: true,
        count: devices.length,
        devices: devices,
        message: devices.length > 0
          ? `Found ${devices.length} device(s)`
          : "No devices found. Check that devices are powered on and on the same network.",
      }));
    }, timeout);
  });
}

