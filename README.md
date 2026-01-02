# kasa-mcp

An MCP (Model Context Protocol) server for Kasa smart home devices. Install it as an npx package to integrate Kasa device control with Claude and other MCP-compatible applications.

## Installation and Claude Desktop Configuration

### Step 1: Install the Package

The package is available on npm and can be used via `npx`:

```bash
npx kasa-mcp@latest
```

### Step 2: Configure Claude Desktop

#### Locate Your Configuration File

Find your Claude Desktop configuration file:

**macOS:**
```bash
~/Library/Application Support/Claude/claude_desktop_config.json
```

**Windows:**
```
%APPDATA%\Claude\claude_desktop_config.json
```

If the file doesn't exist, create it in the appropriate directory.

#### Edit the Configuration

Add the kasa-mcp server to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "kasa-mcp": {
      "command": "npx",
      "args": ["kasa-mcp@latest"]
    }
  }
}
```

**If you already have other MCP servers**, add kasa-mcp alongside them:

```json
{
  "mcpServers": {
    "existing-server": {
      "command": "npx",
      "args": ["existing-server@latest"]
    },
    "kasa-mcp": {
      "command": "npx",
      "args": ["kasa-mcp@latest"]
    }
  }
}
```

### Step 3: Restart Claude Desktop

Close and reopen Claude Desktop completely for the changes to take effect. You should see the kasa-mcp server initialize in the Claude interface.

### Step 4: Verify It's Working

Test the connection by:
1. Looking for the kasa-mcp server indicator in Claude
2. Asking Claude: "What tools are available from kasa-mcp?"
3. Or: "List my Kasa devices"

Claude should respond with the available tools from the kasa-mcp server.

### Alternative: Use Local Development Version

If you're developing locally and want to test changes immediately, use the local build path instead:

```json
{
  "mcpServers": {
    "kasa-mcp": {
      "command": "node",
      "args": ["/Users/sandeep/projects/github.com/sandeepraju/kasa-mcp/build/index.js"]
    }
  }
}
```

Then rebuild with `pnpm build` after making changes and restart Claude.

## Features

- **Device Discovery**: List all Kasa smart devices on your network
- **Device Control**: Turn devices on/off, adjust brightness, and more
- **Real-time Status**: Get current device status and information
- **TypeScript Support**: Full type safety with TypeScript

## Available Tools

### get_devices

List all Kasa smart devices on your network.

**Parameters**: None

**Returns**: List of devices with their information

Example:
```
Claude: "What Kasa devices do I have?"
kasa-mcp: Returns list of all connected Kasa devices
```

## Configuration

### Environment Variables (Kasa-specific)

Configure Kasa device discovery:

- `KASA_NETWORK`: Network interface to scan (optional)
- `KASA_TIMEOUT`: Discovery timeout in milliseconds (default: 5000)

## HTTP Transport

In addition to stdio transport (for Claude Desktop), kasa-mcp supports HTTP transport for remote access, multiple simultaneous clients, and cloud deployments.

### Transport Modes

**Stdio Mode (Default)**
- Used by Claude Desktop
- Single local process
- No network access
- Simplest setup

**HTTP Stateful Mode**
- Multiple concurrent clients
- Session-based state management
- Server-Sent Events (SSE) support for real-time notifications
- Suitable for web applications and persistent connections

**HTTP Stateless Mode**
- Each request is independent
- No session tracking
- Lower memory overhead
- Suitable for serverless and simple request/response scenarios

### Running with HTTP Transport

#### Using npm Scripts

```bash
# HTTP stateful mode (default for HTTP)
pnpm build
pnpm start:http

# HTTP stateless mode
pnpm start:http:stateless

# Development with auto-rebuild
pnpm dev:http
```

#### Using Environment Variables

```bash
# HTTP stateful (default port 3000, localhost only)
MCP_TRANSPORT=http pnpm start:http

# Custom port
MCP_PORT=8080 MCP_TRANSPORT=http node build/index.js

# Custom host (for network access)
MCP_HOST=0.0.0.0 MCP_TRANSPORT=http node build/index.js

# Stateless mode
MCP_TRANSPORT=http MCP_SESSION_MODE=stateless node build/index.js
```

### HTTP Endpoints

When running in HTTP mode, the server exposes the following endpoints:

- **POST /mcp** - Send JSON-RPC requests
  - Without `MCP-Session-ID` header: Initializes a new session (stateful) or processes request (stateless)
  - With `MCP-Session-ID` header: Processes request in existing session (stateful only)

- **GET /mcp** - Establish SSE stream for notifications (stateful mode only)
  - Requires `MCP-Session-ID` header
  - Receives server-sent events and notifications

- **DELETE /mcp** - Terminate session (stateful mode only)
  - Requires `MCP-Session-ID` header
  - Closes the session and cleans up resources

### Testing HTTP Server

#### Using MCP Inspector

```bash
# Start the HTTP server in another terminal
MCP_TRANSPORT=http node build/index.js

# In another terminal, launch MCP Inspector for HTTP
pnpm inspector:http
```

The inspector opens at `http://localhost:6274` and allows you to test the HTTP server.

#### Using curl

**Initialize a session (stateful mode):**

```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2024-11-05",
      "capabilities": {},
      "clientInfo": {
        "name": "test-client",
        "version": "1.0.0"
      }
    }
  }'
```

The response includes a `sessionId` in the headers (check `mcp-session-id`).

**List tools (using session ID):**

```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "MCP-Session-ID: <session-id-from-above>" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/list",
    "params": {}
  }'
```

#### Using TypeScript/JavaScript Client

```typescript
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const client = new Client(
  {
    name: "kasa-client",
    version: "1.0.0"
  },
  {
    capabilities: {}
  }
);

const transport = new StreamableHTTPClientTransport(
  new URL("http://localhost:3000/mcp")
);

await client.connect(transport);
const tools = await client.listTools();
console.log("Available tools:", tools);
```

### Security Considerations

**Default Configuration (Secure)**
- Server binds to `127.0.0.1` (localhost only)
- DNS rebinding protection enabled automatically
- Session IDs are cryptographically secure UUIDs

**Production Deployment**

For public deployments, use a reverse proxy with HTTPS:

**nginx Example:**

```nginx
server {
    listen 443 ssl http2;
    server_name mcp.example.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location /mcp {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_buffering off;
        proxy_cache off;
    }
}
```

**Docker Example:**

```bash
docker run -d \
  -e MCP_TRANSPORT=http \
  -e MCP_HOST=0.0.0.0 \
  -e MCP_PORT=3000 \
  -p 3000:3000 \
  kasa-mcp:latest
```

### Troubleshooting HTTP Mode

**Port already in use:**

```bash
# Find what's using the port
lsof -i :3000

# Use a different port
MCP_PORT=8080 MCP_TRANSPORT=http node build/index.js
```

**Cannot connect from remote host:**

1. Ensure server is listening on `0.0.0.0`: `MCP_HOST=0.0.0.0`
2. Check firewall allows access to the port
3. Verify network connectivity between client and server
4. For secure access, use HTTPS with a reverse proxy

**Session not found error:**

- Verify you're sending the `MCP-Session-ID` header from the initialize response
- Sessions are lost when the server restarts
- In stateless mode, sessions are not supported

## Development

### Prerequisites

- Node.js 18+
- pnpm (or npm/yarn)

### Setup

```bash
# Install dependencies
pnpm install

# Build the project
pnpm build

# Watch mode for development
pnpm dev

# Test the server
pnpm test

# Use MCP Inspector for interactive testing
pnpm inspector
```

### MCP Inspector

The MCP Inspector provides an interactive interface for testing the server:

```bash
pnpm inspector
```

Opens at `http://localhost:6274` where you can:
- List available tools
- Test tool calls
- See real-time communication
- Debug issues

### Project Structure

```
kasa-mcp/
├── src/
│   └── index.ts           # Main MCP server implementation
├── build/                 # Compiled JavaScript (generated)
├── package.json          # Package configuration
├── tsconfig.json         # TypeScript configuration
├── README.md             # This file
└── LICENSE               # MIT License
```

## Publishing

### Before Publishing

1. Update version in `package.json`
2. Update this README with new features
3. Test with MCP Inspector
4. Verify the build: `pnpm build`

### Publishing to npm

```bash
# Login to npm
npm login

# Verify package contents
pnpm pack --dry-run

# Publish
pnpm publish
```

### Testing Published Version

```bash
# Test the published package
npx kasa-mcp@latest
```

## Architecture

### Transports

The server supports multiple transport mechanisms:

**Stdio Transport (Default)**
- Used by Claude Desktop
- Direct integration via stdin/stdout
- No network configuration required
- Secure local-only communication
- Compatible with any MCP client

**HTTP Transport**
- Remote access and cloud deployments
- Supports multiple concurrent clients
- Stateful (session-based) and stateless modes
- Server-Sent Events (SSE) for real-time notifications
- Requires explicit activation via `MCP_TRANSPORT=http`

### Request Handlers

The server implements these MCP protocol handlers:

- **ListToolsRequest**: Provides list of available tools
- **CallToolRequest**: Executes requested tool
- **ListResourcesRequest**: Lists available resources
- **ReadResourceRequest**: Reads resource content

All handlers are available in both stdio and HTTP transport modes.

## Troubleshooting

### Claude Desktop doesn't recognize the server

1. Verify the configuration file is valid JSON:
   - Use a JSON validator to check for syntax errors
   - Ensure proper comma placement between server entries

2. Make sure the file path is correct:
   - **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

3. Restart Claude Desktop completely:
   - Force quit the application
   - Reopen Claude Desktop
   - Wait a few seconds for the server to initialize

4. Check if the server is running:
   ```bash
   source ~/.zshrc  # Load environment variables
   timeout 2 kasa-mcp || true
   ```

### Server won't start

Check that Node.js 18+ is installed:

```bash
node --version
```

If Node.js is too old, install a newer version:
```bash
# Using Homebrew
brew install node@20
```

### MCP Inspector connection fails

Ensure the server can start independently:

```bash
pnpm build
node build/index.js
```

If it still fails, check for error messages and ensure dependencies are installed:
```bash
pnpm install
pnpm build
```

### Devices not found

1. Verify Kasa devices are on the same network
2. Check firewall settings allow device discovery
3. Ensure devices are powered on and connected

### Configuration file not found (Windows)

If `%APPDATA%\Claude\claude_desktop_config.json` doesn't exist:

1. Create the directory: `%APPDATA%\Claude\`
2. Create a new file called `claude_desktop_config.json`
3. Add the configuration from Step 2 above
4. Save and restart Claude Desktop

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test with MCP Inspector
5. Submit a pull request

## Future Enhancements

- Support for more device types (switches, outlets, plugs)
- Energy monitoring and reporting
- Automation and scheduling
- Multi-network support
- Device grouping and scene control

## License

MIT - See LICENSE file for details

## Resources

- [Model Context Protocol Documentation](https://modelcontextprotocol.io)
- [MCP Inspector](https://modelcontextprotocol.io/docs/tools/inspector)
- [Kasa Smart Home Devices](https://www.tp-link.com/us/kasa-smart-home/)
