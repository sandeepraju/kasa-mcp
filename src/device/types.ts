/**
 * Device-related types
 */

export interface DeviceInfo {
  host: string;
  port: number;
  alias: string;
}

export interface DiscoveredDevice {
  deviceId: string;
  alias: string;
  type: string;
  model: string;
  host: string;
  port: number;
}

