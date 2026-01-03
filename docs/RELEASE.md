# Release Guide

This guide explains how to create and publish releases for kasa-mcp.

## Overview

The project uses GitHub Actions to automate publishing. When you push a git tag matching the pattern `v*.*.*` (e.g., `v0.1.0`), the release workflow automatically:

1. ✅ Verifies the tag version matches `package.json`
2. ✅ Builds the project
3. ✅ Publishes to npm
4. ✅ Creates a GitHub release

## Pre-Release Checklist

Before creating a release tag, ensure:

1. ✅ Update version in `package.json`
   ```json
   {
     "version": "0.1.0"
   }
   ```

2. ✅ Update `CHANGELOG.md` with changes for this release

3. ✅ Run all tests: `pnpm test`

4. ✅ Run linting & type checks: `pnpm check`

5. ✅ Build the project: `pnpm build`

6. ✅ Test locally with inspector: `pnpm inspector`

7. ✅ Commit these changes:
   ```bash
   git add package.json CHANGELOG.md
   git commit -m "chore: bump version to 0.1.0"
   git push origin mainline
   ```

## Creating a Release

Once the code is committed and pushed, create and push the release tag:

```bash
# Create the release tag
git tag v0.1.0

# Push the tag to GitHub (triggers the release workflow)
git push origin mainline --tags
```

Or as a single command:

```bash
git tag v0.1.0 && git push origin mainline --tags
```

## What Happens Next

After you push the tag:

1. **GitHub Actions Workflow Runs**
   - Check the "Actions" tab on GitHub to monitor progress
   - The workflow takes 2-5 minutes to complete

2. **npm Publication**
   - Your package is published to npm automatically
   - Verify at: https://www.npmjs.com/package/@sandeepraju/kasa-mcp

3. **GitHub Release**
   - A GitHub release is created automatically
   - Release notes include installation instructions
   - View at: https://github.com/sandeepraju/kasa-mcp/releases

## Verifying the Release

After the workflow completes:

```bash
# Test installing the published version
npx @sandeepraju/kasa-mcp@0.1.0

# Or the latest version
npx @sandeepraju/kasa-mcp@latest
```

## Version Numbering

Follow [Semantic Versioning](https://semver.org/):

- **Patch** (0.1.x): Bug fixes, minor changes
  ```bash
  git tag v0.1.1
  ```

- **Minor** (0.x.0): New features, backwards compatible
  ```bash
  git tag v0.2.0
  ```

- **Major** (x.0.0): Breaking changes
  ```bash
  git tag v1.0.0
  ```

## Required Secrets

The release workflow requires the following GitHub secrets to be configured:

### NPM_TOKEN

This is used to publish the package to npm.

**How to create an NPM token:**

1. Go to https://www.npmjs.com/settings/tokens/create
2. Select "Automation" as the token type
3. Copy the token
4. Add it to GitHub: Settings → Secrets and variables → Actions → New repository secret
5. Name it `NPM_TOKEN`

**To verify the secret is configured:**

1. Go to your GitHub repo
2. Settings → Secrets and variables → Actions
3. Look for `NPM_TOKEN` in the list

## Troubleshooting

### Release Workflow Failed

Check the GitHub Actions logs:

1. Go to your repo → Actions tab
2. Click the failed "Release" workflow
3. Click the failed job to see error details
4. Common issues:
   - Version mismatch between tag and `package.json`
   - Missing or invalid `NPM_TOKEN` secret
   - Tests or build failed

### Version Mismatch Error

If you get: "package.json version doesn't match tag version"

This means the version in `package.json` doesn't match the tag. Fix it:

```bash
# Delete the tag locally and on GitHub
git tag -d v0.1.0
git push origin :v0.1.0

# Update package.json to 0.1.0
# Then create the correct tag
git tag v0.1.0
git push origin mainline --tags
```

### Package Already Exists on npm

If npm says the version already exists, you may have:

1. Already published this version
2. Pushed the tag twice

Check npm: https://www.npmjs.com/package/@sandeepraju/kasa-mcp

If the version exists but the release failed, use npm's unpublish (only within 72 hours):

```bash
npm unpublish @sandeepraju/kasa-mcp@0.1.0
```

Then retrigger the release by deleting and recreating the tag:

```bash
git tag -d v0.1.0
git push origin :v0.1.0
git tag v0.1.0
git push origin mainline --tags
```

## Release Workflow YAML

The release workflow is defined in `.github/workflows/release.yml`. It:

- Triggers on tags matching `v*.*.*`
- Installs dependencies with `pnpm`
- Builds the project
- Verifies version matches
- Publishes to npm with `NPM_TOKEN`
- Creates a GitHub release with installation instructions

See `.github/workflows/release.yml` for details.

## GitHub Releases Page

Each release automatically gets a GitHub release with:

- Release name and tag
- Installation instructions
- Link to CHANGELOG.md for details
- Download links for the release assets

View releases: https://github.com/sandeepraju/kasa-mcp/releases

## Tips & Best Practices

- 📝 Always update CHANGELOG.md before releasing
- 🔖 Use consistent tag naming: `v1.2.3`
- 🧪 Run tests before creating the tag
- 📦 Verify the published package on npm
- 🔐 Keep your NPM_TOKEN secret safe
- ⏸️ Delete a tag if you made a mistake (before workflow completes)

## Quick Reference

```bash
# 1. Update version and changelog
nano package.json CHANGELOG.md

# 2. Commit changes
git add package.json CHANGELOG.md
git commit -m "chore: bump version to 0.1.0"
git push origin mainline

# 3. Create and push the release tag
git tag v0.1.0
git push origin mainline --tags

# 4. Monitor the release
# Go to GitHub Actions tab to watch the workflow

# 5. Verify the package was published
npx @sandeepraju/kasa-mcp@0.1.0
```

## Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [npm Publishing Guide](https://docs.npmjs.com/cli/v9/commands/npm-publish)
- [Semantic Versioning](https://semver.org/)
- [Git Tagging Documentation](https://git-scm.com/book/en/v2/Git-Basics-Tagging)
