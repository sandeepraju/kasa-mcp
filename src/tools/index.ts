/**
 * Tool registry and router
 * Maps tool names to their handler functions
 */

import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { ToolContext } from "./discover-devices.js";
import { handleDiscoverDevices } from "./discover-devices.js";
import { handleGetDeviceInfo } from "./get-device-info.js";
import { handleSetPowerState } from "./set-power-state.js";
import { handleSetBrightness } from "./set-brightness.js";
import { handleSetColorTemperature } from "./set-color-temperature.js";
import { handleGetRealtimeStats } from "./get-realtime-stats.js";
import { createErrorResponse } from "../utils/error-handling.js";

export type ToolHandler = (args: unknown, context: ToolContext) => Promise<CallToolResult>;

/**
 * Tool handler registry
 */
const TOOL_HANDLERS: Record<string, ToolHandler> = {
  discover_devices: handleDiscoverDevices,
  get_device_info: handleGetDeviceInfo,
  set_power_state: handleSetPowerState,
  set_brightness: handleSetBrightness,
  set_color_temperature: handleSetColorTemperature,
  get_realtime_stats: handleGetRealtimeStats,
};

/**
 * Execute a tool by name
 */
export async function executeTool(
  toolName: string,
  args: unknown,
  context: ToolContext
): Promise<CallToolResult> {
  const handler = TOOL_HANDLERS[toolName];
  
  if (!handler) {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            error: true,
            message: `Unknown tool: ${toolName}`,
          }),
        },
      ],
      isError: true,
    };
  }

  try {
    return await handler(args, context);
  } catch (error: unknown) {
    console.error(`[kasa-mcp] Tool error for ${toolName}:`, error);
    return createErrorResponse(toolName, error);
  }
}

