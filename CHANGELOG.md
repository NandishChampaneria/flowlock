# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.0] - 2025-02-23

### Added

- **CLI**: `flowlock snapshot`, `flowlock compare`, `flowlock check`, `flowlock baseline`
- **Breaking classification**: Each change tagged as `breaking` or non-breaking
- **Suggested semver**: `hasBreakingChanges` and `suggestedVersion` in DriftReport
- **Output formats**: `--format json|human|markdown`, `--fail-on all|breaking|none`
- **Security**: Path validation (no traversal), git ref sanitization (no command injection)
- `LoadSnapshotOptions` with `baseDir` for path validation scope

### Changed

- `SignatureChange` now includes `breaking: boolean`
- `loadSnapshot(path, options?)` accepts optional second argument

## [0.2.0] - 2025-02-23

### Added

- **Snapshot persistence**: Save and load snapshots to disk with `saveSnapshot()` and `loadSnapshot()`
- **Git integration**: Create snapshots from any branch, tag, or commit with `snapshotFromGitRef()` and `saveSnapshotFromGitRef()`
- Versioned snapshot format with metadata (createdAt, tsConfigPath, gitRef, gitSha)
- Path normalization for git worktrees so baseline comparison works across checkouts
- Comprehensive test suite: 20 tests covering persistence, git integration, and full workflow
- CI workflow example in README for drift checking on pull requests

### Changed

- Bumped version to 0.2.0 for new features

## [0.1.0] - 2025-02-23

### Added

- Initial release
- `analyzeProject()` - Parse TypeScript projects via tsconfig
- `compareSnapshots()` - Detect function signature drift
- Support for functions, class methods, interfaces, type aliases
