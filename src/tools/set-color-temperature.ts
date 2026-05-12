/**
 * set_color_temperature tool handler
 */

import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { SetColorTemperatureSchema } from "../schemas/index.js";
import type { ToolContext } from "./types.js";
import { KasaMCPError, KasaMCPErrorType } from "../utils/errors.js";
import { createSuccessResponse, createErrorResponse } from "../utils/error-handling.js";
import { isBulbDevice } from "../device/types.js";

export async function handleSetColorTemperature(
  args: unknown,
  context: ToolContext,
): Promise<CallToolResult> {
  const parseResult = SetColorTemperatureSchema.safeParse(args || {});
  if (!parseResult.success) {
    return createErrorResponse(
      "set_color_temperature",
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

  if (!isBulbDevice(device)) {
    const d = device as unknown as Record<string, unknown>;
    const sysInfo = d["sysInfo"] as { model?: string; alias?: string } | undefined;
    const model = sysInfo?.model ?? "unknown";
    const alias = sysInfo?.alias ?? (validatedArgs.deviceId ?? validatedArgs.host ?? "device");
    throw new KasaMCPError(
      `Device "${alias}" (model: ${model}) does not support color temperature control. Only color-capable smart bulbs support this feature (e.g., KL130, LB130).`,
      KasaMCPErrorType.UnsupportedOperation,
      { deviceId: validatedArgs.deviceId, host: validatedArgs.host, model }
    );
  }

  await device.lighting.setLightState(
    { color_temp: validatedArgs.temperature },
    sendOptions,
  );

  return createSuccessResponse({
    success: true,
    deviceId: validatedArgs.deviceId || validatedArgs.host,
    colorTemperature: validatedArgs.temperature,
    message: `Color temperature set to ${validatedArgs.temperature}K`,
  });
}
