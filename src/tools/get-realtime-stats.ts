/**
 * get_realtime_stats tool handler
 */

import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { GetRealtimeStatsSchema } from "../schemas/index.js";
import type { ToolContext } from "./discover-devices.js";
import {
  KasaMCPError,
  KasaMCPErrorType,
} from "../utils/errors.js";
import { createSuccessResponse } from "../utils/error-handling.js";

export async function handleGetRealtimeStats(
  args: unknown,
  context: ToolContext,
): Promise<CallToolResult> {
  const validatedArgs = GetRealtimeStatsSchema.parse(args || {});
  const timeout = validatedArgs.timeout || context.config.kasa.deviceTimeout;
  const sendOptions = { timeout };

  const device = await context.deviceManager.getDevice(
    validatedArgs.deviceId,
    validatedArgs.host,
    timeout,
  );

  // Check if device supports energy monitoring
  if (!device.emeter || !device.emeter.getRealtime) {
    throw new KasaMCPError(
      "This device does not support energy monitoring",
      KasaMCPErrorType.UnsupportedOperation,
    );
  }

  // The upstream library returns unknown, so we cast to any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stats = (await device.emeter.getRealtime(sendOptions)) as any;

  return createSuccessResponse({
    success: true,
    deviceId: validatedArgs.deviceId || validatedArgs.host,
    power: (stats.power || 0) as number,
    voltage: (stats.voltage || 0) as number,
    current: (stats.current || 0) as number,
    totalConsumption: (stats.total_wh || 0) as number,
    unit: {
      power: "W",
      voltage: "V",
      current: "A",
      totalConsumption: "Wh",
    },
  });
}


