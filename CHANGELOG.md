# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-01-02

### Added
- Initial release of kasa-mcp - MCP (Model Context Protocol) server for Kasa smart home devices
- **discover_devices** tool - Discover all Kasa devices on the local network with configurable timeout
- **get_device_info** tool - Get detailed information about a specific device
- **set_power_state** tool - Turn devices on/off
- **set_brightness** tool - Control brightness on supported devices (light bulbs, light strips)
- **set_color_temperature** tool - Control color temperature on color-capable devices
- **get_realtime_stats** tool - Get real-time power consumption and energy statistics
- Support for multiple transport modes: stdio, HTTP (stateful and stateless)
- Comprehensive error handling with detailed error messages
- Type-safe tool parameter validation with Zod schemas
- Full TypeScript support with strict type checking
- Extensive test suite with unit and integration tests
- Development tools: linting (ESLint), formatting, type checking (TypeScript)
- NPM package: [@sandeepraju/kasa-mcp](https://www.npmjs.com/package/@sandeepraju/kasa-mcp)
- Requires Node.js 18.0.0 or higher

### Documentation
- Comprehensive README with setup instructions and usage examples
- Publishing guide for npm releases
- Release guide with automated GitHub Actions workflow
- MCP server protocol implementation for Claude integration

[0.1.0]: https://github.com/sandeepraju/kasa-mcp/releases/tag/v0.1.0
