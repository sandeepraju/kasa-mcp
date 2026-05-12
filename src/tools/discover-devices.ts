/**
 * discover_devices tool handler
 */

import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { DiscoverDevicesSchema } from "../schemas/index.js";
import type { ToolContext } from "./types.js";
import type { DiscoveredDevice } from "../device/types.js";
import { createSuccessResponse, createErrorResponse } from "../utils/error-handling.js";
import { KasaMCPError, KasaMCPErrorType } from "../utils/errors.js";

// Re-export for any callers that still import from here
export type { ToolContext };

export async function handleDiscoverDevices(
  args: unknown,
  context: ToolContext
): Promise<CallToolResult> {
  const parseResult = DiscoverDevicesSchema.safeParse(args || {});
  if (!parseResult.success) {
    return createErrorResponse(
      "discover_devices",
      new KasaMCPError(
        parseResult.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
        KasaMCPErrorType.InvalidArguments,
        { field: parseResult.error.issues[0]?.path.join(".") }
      )
    );
  }
  const validatedArgs = parseResult.data;
  const timeout = validatedArgs.timeout ?? context.config.kasa.discoveryTimeout;
  const devices: DiscoveredDevice[] = [];

  return new Promise((resolve, reject) => {
    // timerHandle must be let so the closure in onError can clearTimeout it
    // eslint-disable-next-line prefer-const
    let timerHandle: ReturnType<typeof setTimeout>;

    const discoveryClient = context.deviceManager.createDiscoveryClient();

    let discovery: ReturnType<typeof discoveryClient.startDiscovery>;
    try {
      discovery = discoveryClient.startDiscovery({
        deviceTypes: context.config.kasa.deviceTypes,
      });
    } catch (err) {
      reject(err instanceof Error ? err : new Error(String(err)));
      return;
    }

    const onDeviceNew = (device: {
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
      context.deviceManager.cacheDeviceInfo(device.deviceId, {
        host: device.host,
        port: device.port,
        alias: device.alias,
      });
    };

    const onError = (err: Error) => {
      clearTimeout(timerHandle);
      discovery.removeListener("device-new", onDeviceNew);
      discoveryClient.stopDiscovery();
      reject(err);
    };

    discovery.on("device-new", onDeviceNew);
    discovery.on("error", onError);

    timerHandle = setTimeout(() => {
      discovery.removeListener("device-new", onDeviceNew);
      discovery.removeListener("error", onError);
      discoveryClient.stopDiscovery();
      resolve(
        createSuccessResponse({
          success: true,
          count: devices.length,
          devices,
          message:
            devices.length > 0
              ? `Found ${devices.length} device(s)`
              : "No devices found. Check that devices are powered on and on the same network.",
        })
      );
    }, timeout);
  });
}
