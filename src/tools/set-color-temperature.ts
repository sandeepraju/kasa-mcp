/**
 * set_color_temperature tool handler
 */

import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { SetColorTemperatureSchema } from "../schemas/index.js";
import type { ToolContext } from "./discover-devices.js";
import {
  KasaMCPError,
  KasaMCPErrorType,
} from "../utils/errors.js";
import { createSuccessResponse } from "../utils/error-handling.js";
import type { Bulb } from "tplink-smarthome-api"; // Import Bulb
import type { KasaDevice } from "../device/types.js"; // Import KasaDevice

// Type guard to check if the device is a bulb that supports lighting
function isBulbDevice(device: KasaDevice): device is Bulb {
  return (
    "lighting" in device &&
    typeof device.lighting === "object" &&
    device.lighting !== null &&
    typeof device.lighting.setLightState === "function"
  );
}

export async function handleSetColorTemperature(
  args: unknown,
  context: ToolContext,
): Promise<CallToolResult> {
  const validatedArgs = SetColorTemperatureSchema.parse(args || {});
  const timeout = validatedArgs.timeout || context.config.kasa.deviceTimeout;
  const sendOptions = { timeout };

  const device = await context.deviceManager.getDevice(
    validatedArgs.deviceId,
    validatedArgs.host,
    timeout,
  );

  // Check if device supports color temperature using the type guard
  if (!isBulbDevice(device)) {
    throw new KasaMCPError(
      "This device does not support color temperature control",
      KasaMCPErrorType.UnsupportedOperation,
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


