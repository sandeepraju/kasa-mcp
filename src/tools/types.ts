/**
 * Shared types for tool handlers.
 */

import type { DeviceManager } from "../device/device-manager.js";
import type { Config } from "../config/index.js";

export interface ToolContext {
  deviceManager: DeviceManager;
  config: Config;
}
