# kasa-mcp Prioritized Roadmap

A prioritized list of tasks from the main [Roadmap](./ROADMAP.md), ordered by the highest return on investment (ROI) and lowest effort.

This list should be tackled in order to deliver the most impactful improvements first.

---

### 1. #1 Add DeviceManager Cleanup/Disposal Method (P1) (Completed)
- **ROI/Effort:** High / Low
- **Reasoning:** This is a critical reliability fix that prevents resource leaks (unclosed connections). The implementation is straightforward, requiring changes in only two files to add a `dispose()` method and call it on shutdown. It's a quick win that significantly improves stability.

### 2. #5 Create Type Aliases for Complex Types (P2) (Completed)
- **ROI/Effort:** Medium / Low
- **Reasoning:** This task offers a great improvement in code quality and developer experience for minimal effort. Replacing complex, repeated type definitions with simple aliases makes the code much easier to read and maintain, which will speed up all future development.

### 3. #4 Add Cache Management Methods (P2)
- **ROI/Effort:** Medium / Low
- **Reasoning:** While not a critical bug fix, this provides immediate value for debugging and testing. The effort to add simple methods like `clearCache()` and `getCacheSize()` is very low, and it will be highly useful for verifying the behavior of other cache-related features (like TTL and LRU).

### 4. #15 Improve Configuration Validation (P2)
- **ROI/Effort:** High / Low-Medium
- **Reasoning:** This task prevents a wide range of confusing, hard-to-debug errors by ensuring the application starts with a valid configuration. Using a schema validator like Zod is a relatively low-effort way to make the application much more robust and user-friendly.

### 5. #2 Implement Cache TTL (Time-To-Live) for Device Info (P1)
- **ROI/Effort:** High / Medium
- **Reasoning:** This addresses a core P1 reliability issue where the server can hold onto stale device IPs indefinitely. While slightly more effort than the items above, it's a crucial fix for ensuring the tool works correctly on typical home networks where IP addresses can change.
