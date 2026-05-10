# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Build
pnpm build          # compile TypeScript to build/
pnpm dev            # watch mode

# Test
pnpm test           # all tests
pnpm test:unit      # unit tests only (tests/unit/)
pnpm test:integration  # integration tests only (tests/integration/)
pnpm test:watch     # watch mode
pnpm test:coverage  # with coverage report

# Quality
pnpm typecheck      # tsc --noEmit
pnpm lint           # eslint
pnpm lint:fix       # eslint --fix
pnpm check          # typecheck + lint

# Run server
pnpm start:stdio                # default (for Claude Desktop)
pnpm start:http                 # HTTP stateful mode
pnpm start:http:stateless       # HTTP stateless mode
pnpm inspector                  # MCP inspector via stdio
pnpm inspector:http             # MCP inspector via HTTP
```

Run a single test file: `pnpm vitest run tests/unit/config.test.ts`

## Architecture

This is a **Model Context Protocol (MCP) server** that exposes TP-Link Kasa smart home devices to AI clients. It uses the `tplink-smarthome-api` library to communicate with Kasa devices on the local network via UDP broadcast.

### Transport modes

The server supports three transport modes, selected via `MCP_TRANSPORT` and `MCP_SESSION_MODE` env vars:

- **stdio** (default): for Claude Desktop integration
- **HTTP stateful** (`MCP_TRANSPORT=http`): session-based, one `Server` instance per session stored in a `Map`
- **HTTP stateless** (`MCP_TRANSPORT=http MCP_SESSION_MODE=stateless`): creates a new server per request

### Data flow

```
index.ts → loadConfig() → DeviceManager → transport runner → createKasaServer()
                                                                    ↓
                                                          tool-definitions (schema)
                                                                    ↓
                                                          executeTool() in tools/index.ts
                                                                    ↓
                                                          individual tool handler
```

### Key design decisions

- **DeviceManager** (`src/device/device-manager.ts`): singleton that holds a cached `Map<deviceId, DeviceInfo>` (host/port/alias) populated by `discover_devices`. Device objects themselves are never cached — a fresh connection is always made per operation. Discovery uses a separate client instance each time to avoid state issues.
- **Tool context**: `ToolContext` (defined in `src/tools/discover-devices.ts`) carries `deviceManager` and `config` and is threaded through all tool handlers.
- **Tool targeting**: tools accept either `deviceId` (resolved to host via cache) or `host` directly. If `deviceId` is given but not in cache, the tool will fail — users must run `discover_devices` first.
- **Zod validation**: all tool inputs are validated with Zod schemas in `src/schemas/index.ts` before execution.
- **Error responses**: tool errors return JSON with `{ error, tool, code, message, suggestion }` shape via `createErrorResponse()`. Success uses `createSuccessResponse()`. Both serialize to `content[0].text` as JSON strings.

### Module layout

| Path | Purpose |
|------|---------|
| `src/config/` | Environment-based config loading |
| `src/device/` | DeviceManager + TypeScript types for Kasa devices |
| `src/schemas/` | Zod schemas for tool input validation |
| `src/server/` | MCP Server factory + tool metadata definitions |
| `src/tools/` | Tool handlers (one file per tool) + router |
| `src/transport/` | stdio, HTTP stateful, and HTTP stateless runners |
| `src/utils/` | Error types (`KasaMCPError`, `KasaMCPErrorType`) + response helpers |
| `tests/unit/` | Unit tests for config, schemas, device manager, error handling |
| `tests/integration/` | Integration tests for tools and server |
| `tests/fixtures/` | Shared mock device factory |

### Adding a new tool

1. Add a Zod schema to `src/schemas/index.ts`
2. Add the tool metadata to `src/server/tool-definitions.ts`
3. Create `src/tools/<tool-name>.ts` implementing `async function handle<ToolName>(args, context): Promise<CallToolResult>`
4. Register it in `TOOL_HANDLERS` in `src/tools/index.ts`

### Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `MCP_TRANSPORT` | `stdio` | `stdio` or `http` |
| `MCP_PORT` | `3000` | HTTP port |
| `MCP_HOST` | `127.0.0.1` | HTTP bind address |
| `MCP_SESSION_MODE` | stateful | set to `stateless` to disable sessions |
| `KASA_DISCOVERY_TIMEOUT` | `30000` | ms to wait during device discovery |
| `KASA_DEVICE_TIMEOUT` | `30000` | ms timeout per device operation |
