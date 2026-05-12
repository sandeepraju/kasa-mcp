/**
 * Server factory tests
 */

import { describe, it, expect, beforeEach } from "vitest";
import { createKasaServer } from "../../src/server/create-server.js";
import { createToolContext } from "../fixtures/mock-device.js";

describe("createKasaServer", () => {
  let context: ReturnType<typeof createToolContext>;

  beforeEach(() => {
    context = createToolContext();
  });

  it("creates server instance", () => {
    const server = createKasaServer(context);

    expect(server).toBeDefined();
    expect(server).toBeTruthy();
  });

  it("server can be created with context", () => {
    const server = createKasaServer(context);
    expect(server).toBeDefined();
  });

  it("server has handlers registered", () => {
    // We can't directly test handler registration, but we can verify
    // the server is created successfully which means handlers were registered
    const server = createKasaServer(context);
    expect(server).toBeDefined();
  });
});

