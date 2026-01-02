/**
 * set_color_temperature tool handler
 */

import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { SetColorTemperatureSchema } from "../schemas/index.js";
import type { ToolContext } from "./discover-devices.js";
import { createSuccessResponse } from "../utils/error-handling.js";

export async function handleSetColorTemperature(
  args: unknown,
  context: ToolContext
): Promise<CallToolResult> {
  const validatedArgs = SetColorTemperatureSchema.parse(args || {});
  const timeout = validatedArgs.timeout || context.config.kasa.deviceTimeout;
  const sendOptions = { timeout };

  const device = await context.deviceManager.getDevice(
    validatedArgs.deviceId,
    validatedArgs.host,
    timeout
  );
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const deviceAny = device as any;

  // Check if device supports color temperature
  if (!deviceAny.lighting || !deviceAny.lighting.setLightState) {
    throw new Error("This device does not support color temperature control");
  }

  await deviceAny.lighting.setLightState({ color_temp: validatedArgs.temperature }, sendOptions);

  return createSuccessResponse({
    success: true,
    deviceId: validatedArgs.deviceId || validatedArgs.host,
    colorTemperature: validatedArgs.temperature,
    message: `Color temperature set to ${validatedArgs.temperature}K`,
  });
}

