/**
 * get_realtime_stats tool handler
 */

import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { GetRealtimeStatsSchema } from "../schemas/index.js";
import type { ToolContext } from "./types.js";
import { KasaMCPError, KasaMCPErrorType } from "../utils/errors.js";
import { createSuccessResponse, createErrorResponse } from "../utils/error-handling.js";
import type { KasaDevice } from "../device/types.js";

// Partial sysInfo fields used for capability detection
interface RealtimeSysInfo {
  model?: string;
  alias?: string;
  feature?: string;
}

interface EmeterStats {
  power?: number;
  voltage?: number;
  current?: number;
  total_wh?: number;
}

// The emeter API is only present on ENE-capable devices.
// We access it via an intersection type to avoid `any`.
type DeviceWithEmeter = KasaDevice & {
  emeter: { getRealtime: (opts: unknown) => Promise<EmeterStats> };
};

function hasEmeterRealtime(device: KasaDevice): device is DeviceWithEmeter {
  const d = device as unknown as Record<string, unknown>;
  const emeter = d["emeter"] as Record<string, unknown> | undefined;
  return typeof emeter?.["getRealtime"] === "function";
}

export async function handleGetRealtimeStats(
  args: unknown,
  context: ToolContext,
): Promise<CallToolResult> {
  const parseResult = GetRealtimeStatsSchema.safeParse(args || {});
  if (!parseResult.success) {
    return createErrorResponse(
      "get_realtime_stats",
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

  const sysInfo = await (device.getSysInfo as () => Promise<RealtimeSysInfo>)();
  const model = sysInfo.model ?? "unknown";
  const alias = sysInfo.alias ?? (validatedArgs.deviceId ?? validatedArgs.host ?? "device");

  if (!hasEmeterRealtime(device)) {
    throw new KasaMCPError(
      `Device "${alias}" (model: ${model}) does not support energy monitoring. Only HS110, KP303, KP400, and similar models with the ENE feature support this tool.`,
      KasaMCPErrorType.UnsupportedOperation,
      { deviceId: validatedArgs.deviceId, host: validatedArgs.host, model }
    );
  }

  const stats = await device.emeter.getRealtime(sendOptions);

  return createSuccessResponse({
    success: true,
    deviceId: validatedArgs.deviceId ?? validatedArgs.host,
    power: stats.power ?? 0,
    voltage: stats.voltage ?? 0,
    current: stats.current ?? 0,
    totalConsumption: stats.total_wh ?? 0,
    unit: {
      power: "W",
      voltage: "V",
      current: "A",
      totalConsumption: "Wh",
    },
  });
}
