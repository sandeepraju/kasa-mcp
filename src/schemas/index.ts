/**
 * Zod validation schemas for tool arguments
 */

import { z } from "zod";

export const DiscoverDevicesSchema = z.object({
  timeout: z.number().optional().describe("Discovery timeout in milliseconds (default: 5000)"),
});

export const GetDeviceInfoSchema = z.object({
  deviceId: z.string().optional().describe("Device ID from discovery"),
  host: z.string().optional().describe("Device IP address"),
  timeout: z.number().optional().describe("Operation timeout in milliseconds (default: 30000)"),
}).refine(data => data.deviceId || data.host, {
  message: "Either deviceId or host must be provided",
});

export const SetPowerStateSchema = z.object({
  deviceId: z.string().optional().describe("Device ID from discovery"),
  host: z.string().optional().describe("Device IP address"),
  state: z.boolean().describe("true = on, false = off"),
  timeout: z.number().optional().describe("Operation timeout in milliseconds (default: 30000)"),
}).refine(data => data.deviceId || data.host, {
  message: "Either deviceId or host must be provided",
});

export const SetBrightnessSchema = z.object({
  deviceId: z.string().optional().describe("Device ID from discovery"),
  host: z.string().optional().describe("Device IP address"),
  brightness: z.number().min(0).max(100).describe("Brightness percentage 0-100"),
  timeout: z.number().optional().describe("Operation timeout in milliseconds (default: 30000)"),
}).refine(data => data.deviceId || data.host, {
  message: "Either deviceId or host must be provided",
});

export const SetColorTemperatureSchema = z.object({
  deviceId: z.string().optional().describe("Device ID from discovery"),
  host: z.string().optional().describe("Device IP address"),
  temperature: z.number().min(2500).max(9000).describe("Color temperature in Kelvin (2500-9000)"),
  timeout: z.number().optional().describe("Operation timeout in milliseconds (default: 30000)"),
}).refine(data => data.deviceId || data.host, {
  message: "Either deviceId or host must be provided",
});

export const GetRealtimeStatsSchema = z.object({
  deviceId: z.string().optional().describe("Device ID from discovery"),
  host: z.string().optional().describe("Device IP address"),
  timeout: z.number().optional().describe("Operation timeout in milliseconds (default: 30000)"),
}).refine(data => data.deviceId || data.host, {
  message: "Either deviceId or host must be provided",
});

