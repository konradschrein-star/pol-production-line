# Release Process Guide

## Overview

Obsidian News Desk uses GitHub Releases for distribution. The auto-updater checks for new releases every 6 hours.

## Prerequisites

1. Git repository pushed to GitHub
2. GitHub Actions enabled
3. Code signing certificate (optional, see CODE_SIGNING.md)
4. Release workflow configured (`.github/workflows/release.yml`)

## Release Steps

### 1. Version Bump

**Update version in package.json:**

```bash
# Manually edit package.json
# Change "version": "1.0.0" → "1.0.1"

# Or use npm version command
npm version patch  # 1.0.0 → 1.0.1
npm version minor  # 1.0.0 → 1.1.0
npm version major  # 1.0.0 → 2.0.0
```

**Commit the version bump:**

```bash
git add package.json package-lock.json
git commit -m "chore: bump version to 1.0.1"
```

### 2. Create Changelog (Optional)

**File:** `CHANGELOG.md`

```markdown
## [1.0.1] - 2026-03-28

### Added
- Auto-updater UI integration
- "Check for Updates" button in settings
- Update notification banner

### Fixed
- Bug #123: Fixed tray icon not updating
- Bug #456: Fixed auto-start registry escaping

### Changed
- Improved update download progress display
```

**Commit changelog:**

```bash
git add CHANGELOG.md
git commit -m "docs: update changelog for v1.0.1"
```

### 3. Create Git Tag

```bash
# Create annotated tag with message
git tag -a v1.0.1 -m "Release v1.0.1: Auto-updater UI integration"

# Push tag to GitHub
git push origin v1.0.1
```

### 4. GitHub Actions Build

**Automatic process:**

1. GitHub detects tag push
2. Workflow `.github/workflows/release.yml` triggers
3. Runs on Windows runner
4. Installs dependencies (`npm ci`)
5. Builds Next.js (`npm run build`)
6. Compiles Electron (`npm run electron:build`)
7. Creates installer (`.exe` in `dist/`)
8. Creates GitHub Release
9. Uploads installer as asset

**Monitor progress:**

- Go to: `https://github.com/yourusername/pol-production-line/actions`
- Click on the workflow run
- Watch build logs

**Build time:** 15-20 minutes (depends on runner speed)

### 5. Verify Release

**Check GitHub Releases:**

1. Go to: `https://github.com/yourusername/pol-production-line/releases`
2. Verify v1.0.1 release created
3. Check assets: `Obsidian-News-Desk-Setup-1.0.1.exe` (2+ GB)
4. Read auto-generated release notes

**Download and test installer:**

```bash
# Download from GitHub
curl -L https://github.com/yourusername/pol-production-line/releases/download/v1.0.1/Obsidian-News-Desk-Setup-1.0.1.exe -o installer.exe

# Run installer on clean VM
installer.exe
```

### 6. Announce Release

**Update documentation:**
- Update README.md with new version
- Update docs/INSTALLER_GUIDE.md if installation process changed

**Notify users:**
- Email list (if applicable)
- Social media
- Forum post

**Auto-updater will notify:**
- All users running older versions will see update notification
- Within 6 hours (next update check cycle)

## Manual Release (Without GitHub Actions)

If GitHub Actions is not available:

### 1. Build locally

```bash
npm run build
npm run electron:publish
```

This will:
- Build the installer
- Upload to GitHub Releases (requires GH_TOKEN environment variable)

### 2. Set GitHub token

```bash
# Windows
set GH_TOKEN=ghp_your_personal_access_token_here

# PowerShell
$env:GH_TOKEN="ghp_your_personal_access_token_here"
```

**Get token:**
- Go to: https://github.com/settings/tokens
- Generate new token (classic)
- Scopes: `repo` (full repo access)
- Copy token and save securely

### 3. Publish

```bash
npm run electron:publish
```

Electron-builder will:
- Create installer
- Upload to GitHub Releases
- Set release as latest

## Troubleshooting

### Build fails: "Cannot find module..."
- Run `npm ci` to clean install dependencies
- Delete `node_modules` and `.next` folders
- Re-run build

### Release creation fails: "Authentication failed"
- Check GH_TOKEN environment variable
- Verify token has `repo` scope
- Token may be expired (regenerate)

### Installer unsigned warning
- Normal if code signing certificate not configured
- See CODE_SIGNING.md for setup
- Users must click "More info" → "Run anyway"

### Auto-updater not detecting release
- Verify release is marked as "latest" (not draft or pre-release)
- Check electron-builder.yml publish configuration
- Verify repository owner/name correct
- Wait up to 6 hours for next check cycle

## Version Numbering

Follow Semantic Versioning (semver):

- **Major (1.0.0 → 2.0.0):** Breaking changes, incompatible API
- **Minor (1.0.0 → 1.1.0):** New features, backward compatible
- **Patch (1.0.0 → 1.0.1):** Bug fixes, backward compatible

**Examples:**
- v1.0.0 - Initial release
- v1.0.1 - Bug fix update
- v1.1.0 - New feature (auto-updater UI)
- v2.0.0 - Major rewrite (breaking changes)

## Release Checklist

Before creating a release:

- [ ] All tests pass
- [ ] Version bumped in package.json
- [ ] Changelog updated
- [ ] Git tag created
- [ ] Code signed (if certificate available)
- [ ] Tested on clean VM
- [ ] Documentation updated
- [ ] Release notes written
- [ ] GitHub Release published
- [ ] Installer verified
- [ ] Auto-updater tested

## Emergency Rollback

If a release has critical bugs:

### 1. Delete broken release

```bash
# Delete tag locally
git tag -d v1.0.1

# Delete tag remotely
git push origin :refs/tags/v1.0.1

# Delete GitHub Release manually on GitHub.com
```

### 2. Create patch release

```bash
# Fix the bug
git commit -m "fix: critical bug"

# Bump to v1.0.2
npm version patch

# Create new tag
git tag -a v1.0.2 -m "Release v1.0.2: Hotfix for critical bug"

# Push
git push origin v1.0.2
```

### 3. Notify users

- Post announcement about broken release
- Ask users to skip v1.0.1 and update to v1.0.2
- Auto-updater will offer v1.0.2 to all users

## Best Practices

1. **Always test on clean VM before release**
2. **Use semantic versioning strictly**
3. **Write clear release notes**
4. **Tag with descriptive messages**
5. **Monitor auto-updater logs after release**
6. **Keep installers under 3 GB if possible**
7. **Sign installers for production releases**
8. **Never delete stable releases**
9. **Use draft releases for testing**
10. **Automate as much as possible**
