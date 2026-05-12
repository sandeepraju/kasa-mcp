/**
 * set_power_state tool handler
 */

import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { SetPowerStateSchema } from "../schemas/index.js";
import type { ToolContext } from "./types.js";
import { createSuccessResponse, createErrorResponse } from "../utils/error-handling.js";
import { KasaMCPError, KasaMCPErrorType } from "../utils/errors.js";

export async function handleSetPowerState(
  args: unknown,
  context: ToolContext,
): Promise<CallToolResult> {
  const parseResult = SetPowerStateSchema.safeParse(args || {});
  if (!parseResult.success) {
    return createErrorResponse(
      "set_power_state",
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
  await device.setPowerState(validatedArgs.state, sendOptions);
  const newState = await device.getPowerState(sendOptions);

  return createSuccessResponse({
    success: true,
    deviceId: validatedArgs.deviceId || validatedArgs.host,
    powerState: newState ? "on" : "off",
    message: `Device turned ${newState ? "on" : "off"}`,
  });
}
