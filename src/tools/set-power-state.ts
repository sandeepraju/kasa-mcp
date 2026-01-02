/**
 * set_power_state tool handler
 */

import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { SetPowerStateSchema } from "../schemas/index.js";
import type { ToolContext } from "./discover-devices.js";
import { createSuccessResponse } from "../utils/error-handling.js";

export async function handleSetPowerState(
  args: unknown,
  context: ToolContext
): Promise<CallToolResult> {
  const validatedArgs = SetPowerStateSchema.parse(args || {});
  const timeout = validatedArgs.timeout || context.config.kasa.deviceTimeout;
  const sendOptions = { timeout };

  const device = await context.deviceManager.getDevice(
    validatedArgs.deviceId,
    validatedArgs.host,
    timeout
  );
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const deviceAny = device as any;
  await deviceAny.setPowerState(validatedArgs.state, sendOptions);
  const newState = await deviceAny.getPowerState(sendOptions);

  return createSuccessResponse({
    success: true,
    deviceId: validatedArgs.deviceId || validatedArgs.host,
    powerState: newState ? "on" : "off",
    message: `Device turned ${newState ? "on" : "off"}`,
  });
}

