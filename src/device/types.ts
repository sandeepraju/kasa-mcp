/**
 * Device-related types and capability guards
 */

import type { Bulb, Client } from "tplink-smarthome-api";

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

/**
 * Type guard: true when the device exposes the bulb `lighting.setLightState` API.
 *
 * Why: tplink-smarthome-api types are loose — plugs and bulbs share the same
 * `Device` superclass, but only bulbs/light strips provide the lighting API.
 */
export function isBulbDevice(device: KasaDevice): device is Bulb {
  if (!("lighting" in device)) return false;
  const lighting = (device as { lighting?: unknown }).lighting;
  return (
    typeof lighting === "object" &&
    lighting !== null &&
    typeof (lighting as { setLightState?: unknown }).setLightState ===
      "function"
  );
}
