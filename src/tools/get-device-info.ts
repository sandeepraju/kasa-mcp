/**
 * get_device_info tool handler
 */

import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { GetDeviceInfoSchema } from "../schemas/index.js";
import type { ToolContext } from "./types.js";
import { createSuccessResponse, createErrorResponse } from "../utils/error-handling.js";
import { KasaMCPError, KasaMCPErrorType } from "../utils/errors.js";

// The tplink-smarthome-api sysInfo shape has different fields across device types.
// We model only what we read here rather than casting to `any`.
interface KasaSysInfo {
  deviceId?: string;
  alias?: string;
  model?: string;
  hw_ver?: string;
  sw_ver?: string;
  mic_type?: string;
  mac?: string;
  ethernet_mac?: string;
}

export async function handleGetDeviceInfo(
  args: unknown,
  context: ToolContext,
): Promise<CallToolResult> {
  const parseResult = GetDeviceInfoSchema.safeParse(args || {});
  if (!parseResult.success) {
    return createErrorResponse(
      "get_device_info",
      new KasaMCPError(
        parseResult.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
        KasaMCPErrorType.InvalidArguments,
        { field: parseResult.error.issues[0]?.path.join(".") }
      )
    );
  }

  const validatedArgs = parseResult.data;
  const timeout = validatedArgs.timeout ?? context.config.kasa.deviceTimeout;
  const sendOptions = { timeout };

  const device = await context.deviceManager.getDevice(
    validatedArgs.deviceId,
    validatedArgs.host,
    timeout,
  );

  const sysInfo = await (device.getSysInfo as (opts: typeof sendOptions) => Promise<KasaSysInfo>)(sendOptions);

  let powerState = "unknown";
  let powerStateError: string | undefined;
  try {
    const isOn = await device.getPowerState(sendOptions);
    powerState = isOn ? "on" : "off";
  } catch (err) {
    powerStateError = err instanceof Error ? err.message : String(err);
    console.error("[kasa-mcp] get_device_info: getPowerState failed:", powerStateError);
  }

  const response: Record<string, unknown> = {
    success: true,
    deviceId: (validatedArgs.deviceId ?? sysInfo.deviceId) ?? "",
    alias: sysInfo.alias ?? device.alias ?? "Unknown",
    model: sysInfo.model ?? "Unknown",
    hwVer: sysInfo.hw_ver ?? "Unknown",
    swVer: sysInfo.sw_ver ?? "Unknown",
    type: sysInfo.mic_type ?? "Unknown",
    macAddress: sysInfo.mac ?? sysInfo.ethernet_mac ?? "Unknown",
    powerState,
  };
  if (powerStateError) {
    response.powerStateError = powerStateError;
  }

  return createSuccessResponse(response);
}
