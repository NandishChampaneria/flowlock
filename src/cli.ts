#!/usr/bin/env node

import { Command } from "commander";
import { resolve } from "path";
import {
  analyzeProject,
  compareSnapshots,
  saveSnapshot,
  loadSnapshot,
  saveSnapshotFromGitRef,
} from "./index.js";
import { formatReport } from "./cli/formatters.js";

const program = new Command();

program
  .name("flowlock")
  .description("Semantic drift detection for TypeScript")
  .version("0.3.0", "-v, --version", "Show version");

program
  .command("snapshot")
  .description("Analyze project and optionally save snapshot")
  .option("-c, --config <path>", "Path to tsconfig.json", "tsconfig.json")
  .option("-o, --output <path>", "Output path for snapshot", ".flowlock/snapshot.json")
  .option("--no-save", "Analyze only, do not save to disk")
  .option("--git-ref <ref>", "Save git ref in metadata")
  .action(async (options) => {
    const cwd = process.cwd();
    const tsConfigPath = resolve(cwd, options.config);
    const snapshot = analyzeProject(tsConfigPath);

    if (options.save !== false) {
      const outputPath = resolve(cwd, options.output);
      saveSnapshot(snapshot, tsConfigPath, {
        outputPath,
        gitRef: options.gitRef,
      });
      console.log(`Snapshot saved to ${outputPath}`);
    } else {
      const fnCount = Object.keys(snapshot.symbols.functions).length;
      const ifaceCount = Object.keys(snapshot.symbols.interfaces).length;
      const typeCount = Object.keys(snapshot.symbols.types).length;
      console.log(`Analyzed: ${fnCount} functions, ${ifaceCount} interfaces, ${typeCount} types`);
    }
  });

program
  .command("compare <before> <after>")
  .description("Compare two snapshots (paths or 'current' for live analysis)")
  .option("-c, --config <path>", "Path to tsconfig.json for 'current'", "tsconfig.json")
  .option(
    "-f, --format <format>",
    "Output format: json, human, markdown",
    "human"
  )
  .option(
    "--fail-on <level>",
    "Exit 1 if: all, breaking, none",
    "none"
  )
  .action(async (before, after, options) => {
    const cwd = process.cwd();
    const tsConfigPath = resolve(cwd, options.config);

    const loadOrAnalyze = async (spec: string) => {
      if (spec === "current") {
        return analyzeProject(tsConfigPath);
      }
      const stored = loadSnapshot(resolve(cwd, spec));
      return stored.snapshot;
    };

    const beforeSnapshot = await loadOrAnalyze(before);
    const afterSnapshot = await loadOrAnalyze(after);
    const report = compareSnapshots(beforeSnapshot, afterSnapshot);

    const output = formatReport(report, options.format);
    console.log(output);

    if (options.failOn === "all") {
      const hasChanges =
        report.addedFunctions.length > 0 ||
        report.removedFunctions.length > 0 ||
        report.modifiedFunctions.length > 0;
      if (hasChanges) process.exit(1);
    } else if (options.failOn === "breaking" && report.hasBreakingChanges) {
      process.exit(1);
    }
  });

program
  .command("check")
  .description("Compare current code against baseline (for CI)")
  .option("-c, --config <path>", "Path to tsconfig.json", "tsconfig.json")
  .option("-b, --baseline <path>", "Baseline snapshot path", ".flowlock/baseline.json")
  .option(
    "-f, --format <format>",
    "Output format: json, human, markdown",
    "human"
  )
  .option(
    "--fail-on <level>",
    "Exit 1 if: all, breaking, none",
    "breaking"
  )
  .action(async (options) => {
    const cwd = process.cwd();
    const tsConfigPath = resolve(cwd, options.config);
    const baselinePath = resolve(cwd, options.baseline);

    const baseline = loadSnapshot(baselinePath);
    const current = analyzeProject(tsConfigPath);
    const report = compareSnapshots(baseline.snapshot, current);

    const output = formatReport(report, options.format);
    console.log(output);

    if (options.failOn === "all") {
      const hasChanges =
        report.addedFunctions.length > 0 ||
        report.removedFunctions.length > 0 ||
        report.modifiedFunctions.length > 0;
      if (hasChanges) process.exit(1);
    } else if (options.failOn === "breaking" && report.hasBreakingChanges) {
      process.exit(1);
    }
  });

program
  .command("baseline")
  .description("Create baseline snapshot from git ref (e.g. main)")
  .argument("<ref>", "Git ref: branch, tag, or commit")
  .option("-c, --config <path>", "Path to tsconfig.json", "tsconfig.json")
  .option(
    "-o, --output <path>",
    "Output path",
    ".flowlock/baseline.json"
  )
  .option("--install-deps", "Run npm install in worktree before analysis")
  .action(async (ref, options) => {
    const cwd = process.cwd();
    const tsConfigPath = resolve(cwd, options.config);
    const outputPath = resolve(cwd, options.output);

    const savedPath = saveSnapshotFromGitRef(tsConfigPath, ref, outputPath, {
      cwd,
      installDeps: options.installDeps,
    });
    console.log(`Baseline saved to ${savedPath}`);
  });

program.parse();
