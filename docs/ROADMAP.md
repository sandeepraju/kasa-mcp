# kasa-mcp Roadmap

A structured roadmap of improvements to implement over the coming weeks. Each item includes context, implementation details, and acceptance criteria.

## Priority Levels

- **P0 (Critical)**: Fixes bugs or addresses security concerns
- **P1 (High)**: Improves reliability, performance, or user experience significantly
- **P2 (Medium)**: Enhances code quality, maintainability, or adds convenience features
- **P3 (Low)**: Nice-to-have improvements with minimal impact

---

## Phase 1: Core Reliability & Memory Safety (Weeks 1-2)

### 1. Add DeviceManager Cleanup/Disposal Method
**Priority**: P1
**Category**: Memory Safety
**Status**: Pending

**Current Problem**:
- `DeviceManager` creates a global Kasa client but never closes it
- Could lead to unclosed connections if the server restarts or crashes
- No way to gracefully shut down the device manager

**Implementation Details**:
- Add `dispose()` method to `DeviceManager` that:
  - Closes the global Kasa client
  - Clears the device info cache
  - Prevents further operations (throw error if called after disposal)
- Update `src/index.ts` to call `dispose()` on process termination (SIGINT, SIGTERM)
- Add tests for disposal behavior

**Acceptance Criteria**:
- [ ] `dispose()` method exists and is properly typed
- [ ] Global client is closed when dispose is called
- [ ] Server gracefully shuts down on SIGINT/SIGTERM
- [ ] Unit tests verify disposal behavior
- [ ] No warnings about unclosed connections in logs

**Related Files**:
- `src/device/device-manager.ts`
- `src/index.ts`
- `tests/unit/device-manager.test.ts`

---

### 2. Implement Cache TTL (Time-To-Live) for Device Info
**Priority**: P1
**Category**: Data Freshness
**Status**: Pending

**Current Problem**:
- Device cache never expires
- If a device IP changes (common in home networks), cached stale IP persists indefinitely
- User must restart server to refresh cache

**Implementation Details**:
- Modify `DeviceInfo` type to include `cachedAt: number` timestamp
- Update `cacheDeviceInfo()` to store timestamp with data
- Add configurable `KASA_CACHE_TTL_MS` environment variable (default: 3600000 = 1 hour)
- Update `getCachedDeviceInfo()` to return `undefined` if cache entry is expired
- Update `getDevice()` to treat expired cache as a cache miss
- Log when cache hits vs misses (debug level)

**Acceptance Criteria**:
- [ ] Cache entries have timestamps
- [ ] `getCachedDeviceInfo()` returns undefined for expired entries
- [ ] `KASA_CACHE_TTL_MS` config option works correctly
- [ ] Stale cache entries are ignored in `getDevice()`
- [ ] Tests verify TTL expiration behavior
- [ ] No cache entries used after TTL expires

**Related Files**:
- `src/device/types.ts`
- `src/device/device-manager.ts`
- `src/config/index.ts`
- `tests/unit/device-manager.test.ts`

---

### 3. Implement Cache Size Limit with LRU Eviction
**Priority**: P1
**Category**: Memory Safety
**Status**: Pending

**Current Problem**:
- Device cache grows unbounded
- In networks with many devices, cache could consume significant memory
- No mechanism to prevent cache bloat

**Implementation Details**:
- Add configurable `KASA_MAX_CACHE_SIZE` environment variable (default: 1000 devices)
- Implement LRU (Least Recently Used) eviction strategy:
  - When cache size exceeds limit, remove least recently accessed entry
  - Track access time for each cache entry
- Add helper method `getDeviceAccessTime()` and `setDeviceAccessTime()`
- Update `getCachedDeviceInfo()` to update access time on hit
- Log when cache eviction occurs (info level)

**Acceptance Criteria**:
- [ ] Cache respects `KASA_MAX_CACHE_SIZE` limit
- [ ] LRU eviction removes least recently used entries
- [ ] Access time is updated on each cache hit
- [ ] Config option can be customized
- [ ] Tests verify LRU eviction behavior
- [ ] No memory leaks from unbounded cache growth

**Related Files**:
- `src/device/types.ts`
- `src/device/device-manager.ts`
- `src/config/index.ts`
- `tests/unit/device-manager.test.ts`

---

### 4. Add Cache Management Methods
**Priority**: P2
**Category**: Developer Experience
**Status**: Pending

**Current Problem**:
- No way to inspect or manage cache from code
- Hard to debug cache-related issues
- Users can't clear stale cache without restarting

**Implementation Details**:
- Add methods to `DeviceManager`:
  - `clearCache()` - clear all cached devices
  - `clearCacheForDevice(deviceId)` - clear specific device
  - `getCacheSize()` - return number of cached devices
  - `getCacheInfo()` - return array of {deviceId, cachedAt, accessedAt}
- All should be synchronous and simple
- Cache info methods don't update access time

**Acceptance Criteria**:
- [ ] `clearCache()` empties the cache map
- [ ] `clearCacheForDevice()` removes specific entry
- [ ] `getCacheSize()` returns correct count
- [ ] `getCacheInfo()` returns accurate metadata
- [ ] Methods are properly typed
- [ ] Tests verify all cache management methods

**Related Files**:
- `src/device/device-manager.ts`
- `tests/unit/device-manager.test.ts`

---

## Phase 2: Type Safety & Developer Experience (Weeks 3-4)

### 5. Create Type Aliases for Complex Types
**Priority**: P2
**Category**: Code Quality
**Status**: Pending

**Current Problem**:
- `getDevice()` return type is `ReturnType<InstanceType<typeof Client>["getDevice"]>` - hard to read
- Repeated complex type expressions reduce readability
- Difficult for users of the library to type their code

**Implementation Details**:
- Create `src/device/types.ts` type aliases:
  - `type KasaDevice = ReturnType<InstanceType<typeof Client>["getDevice"]>`
  - `type KasaClient = InstanceType<typeof Client>`
- Use aliases in:
  - `DeviceManager.getDevice()` return type
  - `DeviceManager.globalKasaClient` type
  - `DeviceManager.createDiscoveryClient()` return type
- Export from `src/device/types.ts` for external use
- Update related imports throughout codebase

**Acceptance Criteria**:
- [ ] Type aliases defined in `src/device/types.ts`
- [ ] Used consistently throughout codebase
- [ ] Easier to read return types in IDE
- [ ] Exported for external use
- [ ] No functionality changes
- [ ] All tests still pass

**Related Files**:
- `src/device/types.ts`
- `src/device/device-manager.ts`
- `src/tools/*.ts`

---

### 6. Add Comprehensive JSDoc Comments
**Priority**: P2
**Category**: Developer Experience
**Status**: Pending

**Current Problem**:
- Public methods lack documentation
- IDE doesn't show helpful autocomplete hints
- New contributors need to read source to understand APIs

**Implementation Details**:
- Add JSDoc comments to all public methods in:
  - `DeviceManager` class
  - All tool handler functions
  - Key utility functions
- Include:
  - Brief description of what method does
  - `@param` tags with types and descriptions
  - `@returns` tag with type and description
  - `@throws` tag for potential errors
  - `@example` for non-obvious usage
- Follow TypeScript JSDoc best practices

**Example**:
```typescript
/**
 * Retrieve a Kasa device by ID or host address.
 * If deviceId is provided, attempts to use cached host information.
 * Always creates a fresh device connection (does not cache device objects).
 *
 * @param deviceId - Unique device identifier from discovery
 * @param host - IP address or hostname of the device
 * @param timeout - Optional operation timeout in milliseconds
 * @returns Promise resolving to a KasaDevice instance
 * @throws Error if neither deviceId nor host provided
 * @throws Error if deviceId provided but not in cache and host not provided
 * @example
 * const device = await deviceManager.getDevice('192.168.1.100');
 */
```

**Acceptance Criteria**:
- [ ] All public methods have JSDoc comments
- [ ] IDE shows proper autocomplete hints
- [ ] Comments accurately describe behavior
- [ ] Examples are provided for complex methods
- [ ] Links to related documentation where helpful

**Related Files**:
- `src/device/device-manager.ts`
- `src/tools/*.ts`
- `src/utils/error-handling.ts`

---

### 7. Standardize Error Types with Enum
**Priority**: P2
**Category**: Code Quality
**Status**: Pending

**Current Problem**:
- Error messages in `src/utils/error-handling.ts` are ad-hoc strings
- No typed error categories
- Hard to programmatically distinguish error types

**Implementation Details**:
- Create `src/types/errors.ts` with:
  ```typescript
  export enum KasaErrorType {
    DEVICE_NOT_FOUND = 'DEVICE_NOT_FOUND',
    CONNECTION_TIMEOUT = 'CONNECTION_TIMEOUT',
    NETWORK_ERROR = 'NETWORK_ERROR',
    UNSUPPORTED_OPERATION = 'UNSUPPORTED_OPERATION',
    INVALID_PARAMETER = 'INVALID_PARAMETER',
    DISCOVERY_FAILED = 'DISCOVERY_FAILED',
  }
  ```
- Refactor `error-handling.ts` to use enum
- Include error type in error response JSON
- Update tool handlers to provide error type context

**Acceptance Criteria**:
- [ ] `KasaErrorType` enum defined and exported
- [ ] `createErrorResponse()` includes error type
- [ ] Tool handlers provide relevant error type
- [ ] Error responses are consistent across tools
- [ ] Tests verify error type classification

**Related Files**:
- `src/types/errors.ts` (new)
- `src/utils/error-handling.ts`
- `src/tools/*.ts`

---

## Phase 3: Observability & Debugging (Weeks 5-6)

### 8. Add Structured Logging Throughout Codebase
**Priority**: P2
**Category**: Observability
**Status**: Pending

**Current Problem**:
- Minimal logging makes debugging difficult
- No visibility into cache hits/misses, retries, or slow operations
- Hard to diagnose network issues

**Implementation Details**:
- Create `src/utils/logger.ts` with simple logging utility:
  - `log(level: 'debug'|'info'|'warn'|'error', message: string, context?: Record<string, unknown>)`
  - Respects `DEBUG` environment variable (set to 'kasa-mcp' to enable)
  - Outputs to stderr with timestamp and level
- Add logging to:
  - `DeviceManager`: cache hits/misses, device connections, disposal
  - `executeTool()`: tool execution start/end, timing
  - All tool handlers: parameter validation, device operations
  - Transport layer: requests/responses, connection events
- Include context data (deviceId, operation, timing, error details)

**Acceptance Criteria**:
- [ ] Logger utility created and used consistently
- [ ] `DEBUG=kasa-mcp` enables debug logging
- [ ] No performance impact when logging disabled
- [ ] Logs help diagnose common issues
- [ ] Logs include relevant context (deviceId, timing, etc.)
- [ ] Tests verify logging behavior

**Related Files**:
- `src/utils/logger.ts` (new)
- `src/device/device-manager.ts`
- `src/tools/index.ts`
- `src/tools/*.ts`

---

### 9. Add Cache Inspector Utility
**Priority**: P3
**Category**: Developer Experience
**Status**: Pending

**Current Problem**:
- Hard to debug cache-related issues
- Users can't inspect what's in the cache
- No way to see cache statistics (hit rate, size, TTL remaining)

**Implementation Details**:
- Create optional CLI command or HTTP endpoint to inspect cache:
  - `npx kasa-mcp --inspect-cache` shows current cached devices
  - `npx kasa-mcp --cache-stats` shows hit/miss statistics
- Add internal stats tracking to `DeviceManager`:
  - `cacheHits: number`
  - `cacheMisses: number`
  - `evictions: number`
- Log cache operations (optional, with `KASA_LOG_CACHE_OPS=true`)

**Acceptance Criteria**:
- [ ] Cache statistics tracked internally
- [ ] CLI commands for inspecting cache
- [ ] Stats show hit rate, size, etc.
- [ ] Commands output human-readable format
- [ ] No performance overhead from stats tracking

**Related Files**:
- `src/device/device-manager.ts`
- `src/index.ts`

---

## Phase 4: Features & User Experience (Weeks 7-8)

### 10. Add Device Friendly Name Aliases
**Priority**: P3
**Category**: User Experience
**Status**: Pending

**Current Problem**:
- Users must remember device IPs or UUIDs
- Discovery results show MAC/model but not friendly names
- Hard to control specific devices without lookup table

**Implementation Details**:
- Add `KASA_DEVICE_ALIASES` environment variable:
  ```
  KASA_DEVICE_ALIASES='{"bedroom_light":"192.168.1.50","living_room_plug":"192.168.1.51"}'
  ```
- Create `src/utils/device-aliases.ts` to parse and manage aliases
- Update tools to accept either deviceId or alias name:
  - `set_power_state` can accept `device: 'bedroom_light'`
  - All tools work with aliases
- Add `list_devices` tool that includes alias names
- Document in README how to set up aliases

**Acceptance Criteria**:
- [ ] Environment variable for aliases parsed correctly
- [ ] Tools accept alias names in addition to IDs
- [ ] Error messages suggest available aliases
- [ ] `list_devices` tool shows aliases
- [ ] Tests verify alias resolution
- [ ] Documented in README

**Related Files**:
- `src/utils/device-aliases.ts` (new)
- `src/config/index.ts`
- `src/tools/*.ts`

---

### 11. Implement Discovery Result Caching
**Priority**: P2
**Category**: Performance
**Status**: Pending

**Current Problem**:
- Discovery runs every time, even if results haven't changed
- Network timeouts during discovery block tool execution
- User can't force use of cached discovery if fresh discovery fails

**Implementation Details**:
- Cache discovery results with:
  - `discoveryResults: DiscoveryResult[] | null`
  - `discoveryAt: number` (timestamp)
  - `KASA_DISCOVERY_CACHE_TTL_MS` config (default: 300000 = 5 minutes)
- Update `discover_devices` tool to:
  - Return cached results if available and not expired
  - Attempt fresh discovery in background
  - Fall back to cache if fresh discovery times out
  - Add `force_refresh` parameter to bypass cache
- Log when using cached vs fresh discovery results

**Acceptance Criteria**:
- [ ] Discovery results are cached with timestamp
- [ ] `KASA_DISCOVERY_CACHE_TTL_MS` config option works
- [ ] Expired cache returns fresh results
- [ ] Timeout falls back to cached results if available
- [ ] `force_refresh` parameter bypasses cache
- [ ] Tests verify caching behavior

**Related Files**:
- `src/device/device-manager.ts`
- `src/tools/discover-devices.ts`
- `src/config/index.ts`

---

### 12. Add Graceful Timeout Handling
**Priority**: P1
**Category**: Reliability
**Status**: Pending

**Current Problem**:
- If operation exceeds timeout, error is unclear
- No circuit breaker pattern to prevent cascading failures
- Timeout config is per-operation, but no global fallback

**Implementation Details**:
- Add `KASA_OPERATION_TIMEOUT_MS` global timeout (default: 30000)
- Update tools to:
  - Use operation-specific timeout if provided, else global timeout
  - Catch timeout errors and provide helpful error message
  - Suggest device might be offline or unreachable
- Add retry logic for transient failures:
  - Configurable `KASA_RETRY_COUNT` (default: 1)
  - Exponential backoff between retries
  - Log retry attempts
- Add circuit breaker pattern:
  - Track consecutive failures per device
  - If >3 consecutive failures, return cached data or skip device
  - Reset on successful operation

**Acceptance Criteria**:
- [ ] Global timeout config respected
- [ ] Timeout errors have helpful messages
- [ ] Retry logic works with exponential backoff
- [ ] Circuit breaker prevents cascade failures
- [ ] Configs for timeout and retries work
- [ ] Tests verify timeout and retry behavior

**Related Files**:
- `src/config/index.ts`
- `src/tools/*.ts`
- `src/utils/error-handling.ts`

---

## Phase 5: Testing & Maintenance (Weeks 9-10)

### 13. Add Type-Safe Tool Handler Registry
**Priority**: P2
**Category**: Code Quality
**Status**: Pending

**Current Problem**:
- `TOOL_HANDLERS` is a plain `Record<string, ToolHandler>`
- Easy to forget to register a new tool
- No compile-time check that all tools in definitions are registered

**Implementation Details**:
- Create `src/tools/registry.ts` with builder pattern:
  ```typescript
  class ToolRegistry {
    private handlers: Map<string, ToolHandler> = new Map();

    register(name: string, handler: ToolHandler): this {
      this.handlers.set(name, handler);
      return this;
    }

    getHandler(name: string): ToolHandler | undefined {
      return this.handlers.get(name);
    }
  }
  ```
- Update `src/tools/index.ts` to use registry
- Add validation that all tools in definitions are registered at startup
- Fail fast if registration is incomplete

**Acceptance Criteria**:
- [ ] Tool registry builder pattern implemented
- [ ] All tools registered via builder
- [ ] Validation checks all definitions have handlers
- [ ] Fails at startup if tools missing
- [ ] Compile-time safety improved
- [ ] Tests verify registry behavior

**Related Files**:
- `src/tools/registry.ts` (new)
- `src/tools/index.ts`

---

### 14. Expand Integration Test Coverage
**Priority**: P2
**Category**: Testing
**Status**: Pending

**Current Problem**:
- Tests rely on mocks of Kasa API
- Breaking changes in `tplink-smarthome-api` not caught until production
- Integration with real devices untested

**Implementation Details**:
- Add optional integration tests for real Kasa devices:
  - Tests only run if `KASA_TEST_DEVICE_HOST` env var is set
  - Require disclaimer that tests will control real devices
  - Tests for each tool against real device:
    - Discovery
    - Device info retrieval
    - Power state changes
    - Brightness/color adjustments
- Add GitHub workflow for integration testing (optional, manual trigger)
- Document how to run integration tests locally

**Acceptance Criteria**:
- [ ] Integration tests exist for all tools
- [ ] Tests skip cleanly if no test device configured
- [ ] Tests perform actual device operations
- [ ] Results verified against expected state
- [ ] Documentation explains how to run
- [ ] Tests don't break existing mock-based tests

**Related Files**:
- `tests/integration/real-device.test.ts` (new)
- `.github/workflows/integration-test.yml` (new)

---

### 15. Improve Configuration Validation
**Priority**: P2
**Category**: Reliability
**Status**: Pending

**Current Problem**:
- `loadConfig()` has minimal validation
- Invalid config values silently produce unexpected behavior
- Users get confusing errors downstream if config is wrong

**Implementation Details**:
- Add Zod schema for configuration:
  ```typescript
  const ConfigSchema = z.object({
    transport: z.object({
      mode: z.enum(['stdio', 'http']),
      port: z.number().int().positive(),
      host: z.string().ip(),
      sessionMode: z.boolean(),
    }),
    kasa: z.object({
      discoveryTimeoutMs: z.number().int().positive(),
      deviceTimeoutMs: z.number().int().positive(),
      maxCacheSize: z.number().int().positive(),
      cacheTtlMs: z.number().int().nonnegative(),
    }),
  });
  ```
- Validate config at startup, fail with helpful error if invalid
- Provide defaults for all optional values
- Log final config in debug mode (excluding secrets)

**Acceptance Criteria**:
- [ ] Configuration schema defined and validated
- [ ] Invalid config fails at startup with helpful errors
- [ ] All values have sensible defaults
- [ ] Config is logged in debug mode
- [ ] Tests verify validation behavior
- [ ] No type errors from config usage

**Related Files**:
- `src/config/index.ts`
- `tests/unit/config.test.ts`

---

## Phase 6: Advanced Features (Weeks 11-12)

### 16. Add Batch Device Operations
**Priority**: P3
**Category**: Features
**Status**: Pending

**Current Problem**:
- Each tool operates on single device
- Controlling multiple devices requires multiple API calls
- No way to turn off all devices at once (common use case)

**Implementation Details**:
- Add new tools:
  - `control_multiple_devices`: Set power state on multiple devices
  - `get_multiple_devices_info`: Get info for multiple devices in one call
- Parameters:
  - `devices: string[]` - array of deviceIds or hosts
  - `parallel: boolean` (default: true) - run operations in parallel
- Return results as array with status for each device
- Handle partial failures gracefully (some succeed, some fail)

**Acceptance Criteria**:
- [ ] Batch tools implemented
- [ ] Both serial and parallel execution modes work
- [ ] Partial failures handled correctly
- [ ] Results show success/failure for each device
- [ ] Performance is better than sequential calls
- [ ] Tests verify batch operations

**Related Files**:
- `src/tools/control-multiple-devices.ts` (new)
- `src/tools/get-multiple-devices-info.ts` (new)

---

### 17. Add HTTP API Documentation & OpenAPI Spec
**Priority**: P3
**Category**: Developer Experience
**Status**: Pending

**Current Problem**:
- HTTP API is undocumented
- No OpenAPI spec for tools
- Developers can't easily discover available endpoints

**Implementation Details**:
- Generate OpenAPI 3.0 spec from tool definitions
- Serve OpenAPI spec at `GET /openapi.json`
- Host Swagger UI at `GET /api/docs`
- Include examples for each endpoint
- Document all error codes and responses

**Acceptance Criteria**:
- [ ] OpenAPI spec generated from tool definitions
- [ ] Spec available at `/openapi.json`
- [ ] Swagger UI available at `/api/docs`
- [ ] All tools documented with examples
- [ ] Error responses documented
- [ ] Easy to integrate with API clients

**Related Files**:
- `src/server/openapi.ts` (new)
- `src/transport/http-stateless.ts`

---

## Success Metrics

Track these to measure progress:

- **Code Quality**: All files have JSDoc, 80%+ test coverage
- **Performance**: Cache hit rate >90%, discovery cached, no N+1 queries
- **Reliability**: All timeouts handled gracefully, no unclosed connections
- **Developer Experience**: Clear error messages, comprehensive logging, good documentation
- **User Experience**: Friendly device names, batch operations, cache management

---

## Notes for Implementation

1. **Dependencies**: Complete items in order listed within each phase. Phase 1 items don't depend on later items.

2. **Testing**: Add tests for each item before marking complete.

3. **Documentation**: Update README and inline comments as you go.

4. **Backwards Compatibility**: All changes should be backwards-compatible. New config options should have sensible defaults.

5. **Git Workflow**: Create feature branches for each item (e.g., `feat/device-cleanup`, `feat/cache-ttl`). Squash commits and merge to main.

6. **Code Review**: Ensure code follows existing patterns in the codebase.

7. **Manual Testing**: Test changes with real Kasa devices or detailed mock testing when possible.

