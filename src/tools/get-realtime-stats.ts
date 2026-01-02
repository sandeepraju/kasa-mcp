/**
 * get_realtime_stats tool handler
 */

import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { GetRealtimeStatsSchema } from "../schemas/index.js";
import type { ToolContext } from "./discover-devices.js";
import { createSuccessResponse } from "../utils/error-handling.js";

export async function handleGetRealtimeStats(
  args: unknown,
  context: ToolContext
): Promise<CallToolResult> {
  const validatedArgs = GetRealtimeStatsSchema.parse(args || {});
  const timeout = validatedArgs.timeout || context.config.kasa.deviceTimeout;
  const sendOptions = { timeout };

  const device = await context.deviceManager.getDevice(
    validatedArgs.deviceId,
    validatedArgs.host,
    timeout
  );
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const deviceAny = device as any;

  // Check if device supports energy monitoring
  if (!deviceAny.emeter || !deviceAny.emeter.getRealtime) {
    throw new Error("This device does not support energy monitoring");
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stats = await deviceAny.emeter.getRealtime(sendOptions) as any;

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

