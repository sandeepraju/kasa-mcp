/**
 * get_device_info tool handler
 */

import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { GetDeviceInfoSchema } from "../schemas/index.js";
import type { ToolContext } from "./discover-devices.js";
import { createSuccessResponse } from "../utils/error-handling.js";

export async function handleGetDeviceInfo(
  args: unknown,
  context: ToolContext,
): Promise<CallToolResult> {
  const validatedArgs = GetDeviceInfoSchema.parse(args || {});
  const timeout = validatedArgs.timeout || context.config.kasa.deviceTimeout;
  const sendOptions = { timeout };

  const device = await context.deviceManager.getDevice(
    validatedArgs.deviceId,
    validatedArgs.host,
    timeout,
  );
  // The tplink-smarthome-api library has inconsistent Sysinfo types, so we cast to any
  // to access properties that may or may not exist on all devices.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sysInfo = (await device.getSysInfo(sendOptions)) as any;

  // Get current power state
  let powerState = "unknown";
  try {
    const isOn = await device.getPowerState(sendOptions);
    powerState = isOn ? "on" : "off";
  } catch {
    // Device might not support power state query
  }

  return createSuccessResponse({
    success: true,
    deviceId: (validatedArgs.deviceId || sysInfo.deviceId) as string,
    alias: (sysInfo.alias || device.alias || "Unknown") as string,
    model: (sysInfo.model || "Unknown") as string,
    hwVer: (sysInfo.hw_ver || "Unknown") as string,
    swVer: (sysInfo.sw_ver || "Unknown") as string,
    type: (sysInfo.mic_type || "Unknown") as string,
    macAddress: (sysInfo.mac || sysInfo.ethernet_mac || "Unknown") as string,
    powerState: powerState,
  });
}


