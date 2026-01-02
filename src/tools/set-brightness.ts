/**
 * set_brightness tool handler
 */

import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { SetBrightnessSchema } from "../schemas/index.js";
import type { ToolContext } from "./discover-devices.js";
import { createSuccessResponse } from "../utils/error-handling.js";

export async function handleSetBrightness(
  args: unknown,
  context: ToolContext
): Promise<CallToolResult> {
  const validatedArgs = SetBrightnessSchema.parse(args || {});
  const timeout = validatedArgs.timeout || context.config.kasa.deviceTimeout;
  const sendOptions = { timeout };

  const device = await context.deviceManager.getDevice(
    validatedArgs.deviceId,
    validatedArgs.host,
    timeout
  );
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const deviceAny = device as any;

  // Check if device supports brightness
  if (!deviceAny.lighting || !deviceAny.lighting.setLightState) {
    throw new Error("This device does not support brightness control");
  }

  await deviceAny.lighting.setLightState({ brightness: validatedArgs.brightness }, sendOptions);

  return createSuccessResponse({
    success: true,
    deviceId: validatedArgs.deviceId || validatedArgs.host,
    brightness: validatedArgs.brightness,
    message: `Brightness set to ${validatedArgs.brightness}%`,
  });
}

