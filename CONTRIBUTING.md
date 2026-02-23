# Contributing to FlowLock

Thanks for your interest in contributing!

## Development Setup

```bash
git clone https://github.com/your-username/flowlock.git
cd flowlock
npm install
npm run build
npm test
```

## Running Tests

```bash
npm test          # Run all tests
npm run test:watch  # Watch mode
```

## Code Style

- Strict TypeScript (no `any`)
- Small, focused modules
- No console logs in core logic

## Pull Request Process

1. Fork and create a feature branch
2. Add tests for new functionality
3. Ensure `npm run build` and `npm test` pass
4. Submit a PR with a clear description

## Project Structure

```
src/
├── index.ts           # Public API
├── types.ts           # Core types
├── parser/            # TypeScript parsing
├── analyzer/          # Drift detection
├── persistence/       # Snapshot save/load
├── git/               # Git integration
└── model/             # Data structures
```
