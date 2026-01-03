# Publishing Guide

This guide walks you through publishing kasa-mcp to npm.

## Pre-Publishing Checklist

Before publishing a new version, ensure:

1. ✅ Version is updated in `package.json`
2. ✅ README is up-to-date with new features
3. ✅ Tests pass: `pnpm test`
4. ✅ Type checking passes: `pnpm typecheck`
5. ✅ Linting passes: `pnpm lint`
6. ✅ Build succeeds: `pnpm build`
7. ✅ Manual testing with inspector: `pnpm inspector`

## Publishing Steps

### 1. Run Tests & Build

```bash
# Run the full test suite
pnpm test

# Check types and linting
pnpm check

# Build the project
pnpm build
```

### 2. Verify Package Contents

```bash
# See what will be published
pnpm pack
```

This creates a `.tgz` file with the package contents (e.g., `sandeepraju-kasa-mcp-0.1.0.tgz`). You can inspect it to verify only the `build/` directory is included. After verifying, you can delete the `.tgz` file:

```bash
rm sandeepraju-kasa-mcp-*.tgz
```

### 3. Login to npm

```bash
npm login
```

Enter your npm credentials:
- Username
- Password
- Email
- 2FA code (if enabled)

### 4. Publish

```bash
pnpm publish
```

The `prepublishOnly` script will automatically run `pnpm build` before publishing, ensuring your build is always up-to-date.

### 5. Verify the Published Package

```bash
# Test installing the published version
npx @sandeepraju/kasa-mcp@latest
```

## Package Configuration

Current package details:
- **Name**: `@sandeepraju/kasa-mcp` (scoped package)
- **Access**: Public (configured in `publishConfig`)
- **Main Entry**: `./build/index.js`
- **Binary**: `kasa-mcp` command via npx
- **Files**: Only `build/` directory is published
- **Engines**: Requires Node.js >= 18.0.0

## Version Management

Follow [Semantic Versioning](https://semver.org/):

- **Patch** (0.1.x): Bug fixes, minor changes
- **Minor** (0.x.0): New features, backwards compatible
- **Major** (x.0.0): Breaking changes

Update version in `package.json` before publishing:

```json
{
  "version": "0.1.1"  // or "0.2.0", "1.0.0", etc.
}
```

## Troubleshooting

### Package Already Published

If you get an error that the version already exists:

```bash
# Update the version number in package.json
# Then publish again
pnpm publish
```

### Unpublishing (Emergency Only)

Within 72 hours of publishing, you can unpublish:

```bash
npm unpublish @sandeepraju/kasa-mcp@0.1.0
```

⚠️ **Warning**: Unpublishing is discouraged unless there's a critical security issue or accidentally published credentials.

### Publishing Fails Due to Tests

If publishing fails because tests don't pass:

```bash
# Fix the failing tests first
pnpm test

# Or skip prepublish checks (NOT recommended)
pnpm publish --no-git-checks
```

## Post-Publishing

After publishing:

1. ✅ Test the published package: `npx @sandeepraju/kasa-mcp@latest`
2. ✅ Update GitHub release with changelog
3. ✅ Tag the release: `git tag v0.1.0 && git push --tags`
4. ✅ Announce on relevant channels

## Security

- ✅ Never commit `.npmrc` with authentication tokens
- ✅ Use 2FA on your npm account
- ✅ Review `package.json` before publishing to ensure no sensitive data
- ✅ Check that only `build/` is included in the published package

## Resources

- [npm Publishing Guide](https://docs.npmjs.com/cli/v9/commands/npm-publish)
- [Semantic Versioning](https://semver.org/)
- [npm Pack Documentation](https://docs.npmjs.com/cli/v9/commands/npm-pack)
