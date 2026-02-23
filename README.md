# FlowLock

**Semantic drift detection engine for TypeScript**

FlowLock is a static analysis library that detects semantic drift in TypeScript projects—when function signatures, return types, or type definitions change while other parts of the codebase still rely on old assumptions.

## Features

- Parse TypeScript projects using `tsconfig.json`
- Extract function declarations, exported functions, class methods, interfaces, and type aliases
- Compare two project snapshots to detect signature-level drift
- **Breaking vs non-breaking** — Classify changes; optional param added = non-breaking
- **Suggested semver** — `major` / `minor` / `patch` based on change severity
- **CLI** — `flowlock snapshot`, `flowlock compare`, `flowlock check`, `flowlock baseline`
- **Snapshot persistence** — Save and load snapshots for CI and baseline comparison
- **Git integration** — Snapshot any branch, tag, or commit without checking out

## Installation

```bash
npm install @nandishchampaneria/flowlock
```

## Quick Start

```typescript
import { analyzeProject, compareSnapshots } from "@nandishchampaneria/flowlock";

const before = analyzeProject("./tsconfig.json");
// ... make changes ...
const after = analyzeProject("./tsconfig.json");
const report = compareSnapshots(before, after);

console.log("Modified:", report.modifiedFunctions);
console.log("Added:", report.addedFunctions);
console.log("Removed:", report.removedFunctions);
```

## Snapshot Persistence

Save snapshots to disk for baseline comparison in CI:

```typescript
import {
  analyzeProject,
  saveSnapshot,
  loadSnapshot,
  compareSnapshots,
} from "@nandishchampaneria/flowlock";

// Save a baseline (e.g. on main branch)
const snapshot = analyzeProject("./tsconfig.json");
saveSnapshot(snapshot, "./tsconfig.json", {
  outputPath: ".flowlock/baseline.json",
  gitRef: "main",
  gitSha: "abc1234",
});

// Later: compare current code against baseline
const baseline = loadSnapshot(".flowlock/baseline.json");
const current = analyzeProject("./tsconfig.json");
const report = compareSnapshots(baseline.snapshot, current);

if (report.modifiedFunctions.length > 0) {
  console.error("Breaking changes detected!");
  process.exit(1);
}
```

## Git Integration

Snapshot any git ref without modifying your working tree:

```typescript
import {
  snapshotFromGitRef,
  saveSnapshotFromGitRef,
  loadSnapshot,
  compareSnapshots,
  analyzeProject,
} from "@nandishchampaneria/flowlock";

// Snapshot main branch (creates temp worktree, analyzes, cleans up)
const baseline = snapshotFromGitRef("./tsconfig.json", "main");
const current = analyzeProject("./tsconfig.json");
const report = compareSnapshots(baseline.snapshot, current);

// Or save baseline to disk for CI
saveSnapshotFromGitRef("./tsconfig.json", "main", ".flowlock/main.json");
const stored = loadSnapshot(".flowlock/main.json");
```

## API Reference

### Core

| Function | Description |
|----------|-------------|
| `analyzeProject(tsConfigPath)` | Parse project and return a `ProjectSnapshot` |
| `compareSnapshots(before, after)` | Compare snapshots and return a `DriftReport` |

### Persistence

| Function | Description |
|----------|-------------|
| `saveSnapshot(snapshot, tsConfigPath, options?)` | Save snapshot to disk with metadata |
| `loadSnapshot(path)` | Load a stored snapshot |

### Git

| Function | Description |
|----------|-------------|
| `snapshotFromGitRef(tsConfigPath, gitRef, options?)` | Create snapshot from branch/tag/commit |
| `saveSnapshotFromGitRef(tsConfigPath, gitRef, outputPath?, options?)` | Snapshot from git and save to disk |

## CLI

```bash
# Analyze and save snapshot
flowlock snapshot -c tsconfig.json -o .flowlock/snapshot.json

# Compare two snapshots (or use "current" for live analysis)
flowlock compare .flowlock/main.json current --format human

# CI: compare against baseline, exit 1 on breaking changes
flowlock check -b .flowlock/baseline.json --fail-on breaking

# Create baseline from git ref
flowlock baseline main -o .flowlock/baseline.json
```

| Command | Description |
|---------|-------------|
| `snapshot` | Analyze project, optionally save |
| `compare <before> <after>` | Compare snapshots (use `current` for live) |
| `check` | Compare current vs baseline (CI) |
| `baseline <ref>` | Snapshot from git branch/tag/commit |

**Options:** `--format json|human|markdown`, `--fail-on all|breaking|none`

## Drift Report

```typescript
interface DriftReport {
  modifiedFunctions: FunctionDrift[];  // Signature changes (with breaking flag)
  addedFunctions: string[];
  removedFunctions: string[];
  hasBreakingChanges: boolean;
  suggestedVersion: "major" | "minor" | "patch";
}
```

- **Breaking:** param removed, param type changed, return type changed, required param added
- **Non-breaking:** optional param added

## CI Workflow Example

```yaml
# .github/workflows/flowlock.yml
name: FlowLock

on: [pull_request]

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0  # Required for git worktree

      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"

      - run: npm ci
      - run: npm run build
      - run: npm install @nandishchampaneria/flowlock

      - name: Check for semantic drift
        run: |
          npx flowlock baseline origin/main -o .flowlock/baseline.json
          npx flowlock check -b .flowlock/baseline.json --fail-on breaking
```

## Requirements

- Node.js 18+
- TypeScript 5.x
- Git (for `snapshotFromGitRef`)

## License

MIT
