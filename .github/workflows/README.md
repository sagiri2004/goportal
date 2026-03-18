# GitHub Actions - Desktop Build & Release

## Quick Start

### Automatic Release (Recommended)

1. Make changes to `frontend/` or workflow files
2. Commit with conventional message:
   ```bash
   git commit -m "feat: add new feature"
   git commit -m "fix: resolve bug"
   ```
3. Push to `main` branch:
   ```bash
   git push origin main
   ```
4. GitHub Actions automatically:
   - Builds MSI on Windows
   - Builds DEB on Ubuntu
   - Creates GitHub Release
   - Attaches artifacts

### Manual Build

1. Go to GitHub repo → **Actions** tab
2. Select **"Build Desktop (Manual)"**
3. Click **"Run workflow"**
4. Choose target:
   - `windows-msi` - Build only Windows
   - `linux-deb` - Build only Linux
   - `both` - Build both (default)
5. Wait for completion (~10-15 min)
6. Download from **Artifacts**

## Files Modified

### Workflows
- `.github/workflows/desktop-release.yml` - Automatic release on push
- `.github/workflows/build-desktop.yml` - Manual build workflow

### Configuration
- `.releaserc.json` - Semantic release configuration
- `GITHUB_ACTIONS_SETUP.md` - Detailed setup guide

### Build
- `frontend/turbo.json` - Added `dist:win` and `dist:linux` tasks
- `frontend/apps/desktop/package.json` - Added homepage field
- `frontend/BUILD_INSTRUCTIONS.md` - Local build guide

## What Gets Built

### Windows (on windows-latest)
- **Output:** `GoPortal Setup 0.0.1.msi` (~200 MB)
- **Format:** NSIS Installer
- **Includes:** 
  - Electron 28.3.3
  - Node.js runtime
  - Desktop app

### Linux (on ubuntu-latest)
- **Output:** `desktop_0.0.1_amd64.deb` (~140 MB)
- **Format:** Debian package
- **Includes:**
  - Electron 28.3.3
  - Node.js runtime
  - Desktop app

## Release Notes

Releases are automatically generated from conventional commits:

```
✨ Features
- New feature description

🐛 Bug Fixes
- Bug fix description

⚡ Performance
- Performance improvement description
```

## Environment Variables

No secrets needed - uses default `GITHUB_TOKEN` for:
- Creating releases
- Uploading artifacts
- Pushing git tags

## Troubleshooting

### Workflow doesn't trigger
- Check file paths in `on.paths`
- Ensure commit is to `main` branch
- Check workflow file syntax

### Build fails
- Check **Actions** → **Logs**
- Common issues:
  - Node.js cache issue → Clear cache
  - Wine missing → Installed automatically
  - Sidecars missing → Created automatically

### Artifacts not uploading
- Verify build succeeds (check logs)
- Check file extensions (`.msi` or `.deb`)
- Verify paths in upload action

## Next Steps

1. **Test locally first:**
   ```bash
   cd frontend/apps/desktop
   npm run dist:linux
   npm run dist:win  # requires wine
   ```

2. **Push to main** with conventional commits
3. **Wait for GitHub Actions** to complete
4. **Download installers** from Releases page

## Useful Links

- [View Workflow Runs](../../actions)
- [View Releases](../../releases)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Electron Builder](https://www.electron.build/)
- [Semantic Release](https://semantic-release.gitbook.io/)

## Support

For issues or questions:
1. Check GitHub Actions logs
2. Review `GITHUB_ACTIONS_SETUP.md`
3. See local build instructions in `frontend/BUILD_INSTRUCTIONS.md`
