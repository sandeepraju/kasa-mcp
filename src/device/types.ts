/**
 * Device-related types
 */

import type { Client } from "tplink-smarthome-api";

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

export type KasaDevice = Awaited<
  ReturnType<InstanceType<typeof Client>["getDevice"]>
>;
export type KasaClient = InstanceType<typeof Client>;


