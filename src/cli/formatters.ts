import type { DriftReport } from "../types.js";

export function formatReport(report: DriftReport, format: string): string {
  switch (format) {
    case "json":
      return JSON.stringify(report, null, 2);
    case "markdown":
      return formatMarkdown(report);
    case "human":
    default:
      return formatHuman(report);
  }
}

function formatHuman(report: DriftReport): string {
  const lines: string[] = [];

  if (report.addedFunctions.length > 0) {
    lines.push("Added functions:");
    report.addedFunctions.forEach((f) => lines.push(`  + ${f}`));
    lines.push("");
  }

  if (report.removedFunctions.length > 0) {
    lines.push("Removed functions:");
    report.removedFunctions.forEach((f) => lines.push(`  - ${f}`));
    lines.push("");
  }

  if (report.modifiedFunctions.length > 0) {
    lines.push("Modified functions:");
    for (const fn of report.modifiedFunctions) {
      lines.push(`  ~ ${fn.name} (${fn.filePathAfter})`);
      for (const change of fn.changes) {
        const badge = change.breaking ? "[BREAKING]" : "";
        const desc = describeChange(change);
        lines.push(`      ${badge} ${desc}`);
      }
    }
    lines.push("");
  }

  if (lines.length === 0) {
    lines.push("No drift detected.");
  }
  lines.push("");
  lines.push(
    `Suggested version bump: ${report.suggestedVersion}` +
      (report.hasBreakingChanges ? " (breaking changes detected)" : "")
  );

  return lines.join("\n");
}

function formatMarkdown(report: DriftReport): string {
  const lines: string[] = ["# FlowLock Drift Report", ""];

  if (report.addedFunctions.length > 0) {
    lines.push("## Added Functions");
    report.addedFunctions.forEach((f) => lines.push(`- \`${f}\``));
    lines.push("");
  }

  if (report.removedFunctions.length > 0) {
    lines.push("## Removed Functions");
    report.removedFunctions.forEach((f) => lines.push(`- \`${f}\``));
    lines.push("");
  }

  if (report.modifiedFunctions.length > 0) {
    lines.push("## Modified Functions");
    for (const fn of report.modifiedFunctions) {
      lines.push(`### ${fn.name}`);
      lines.push(`**File:** \`${fn.filePathAfter}\``);
      lines.push("");
      lines.push("| Change | Breaking |");
      lines.push("|--------|----------|");
      for (const change of fn.changes) {
        lines.push(`| ${describeChange(change)} | ${change.breaking ? "Yes" : "No"} |`);
      }
      lines.push("");
    }
  }

  lines.push("---");
  lines.push(`**Suggested version:** \`${report.suggestedVersion}\``);
  if (report.hasBreakingChanges) {
    lines.push("");
    lines.push("⚠️ **Breaking changes detected**");
  }

  return lines.join("\n");
}

function describeChange(
  change:
    | { type: "parameter-added"; parameter: { name: string; type: string; optional: boolean } }
    | { type: "parameter-removed"; parameter: { name: string } }
    | { type: "parameter-type-changed"; before: { name: string }; after: { name: string; type: string } }
    | { type: "return-type-changed"; before: string; after: string }
): string {
  switch (change.type) {
    case "parameter-added":
      return `Parameter added: ${change.parameter.name}${change.parameter.optional ? "?" : ""}: ${change.parameter.type}`;
    case "parameter-removed":
      return `Parameter removed: ${change.parameter.name}`;
    case "parameter-type-changed":
      return `Parameter type changed: ${change.before.name} -> ${change.after.type}`;
    case "return-type-changed":
      return `Return type changed: ${change.before} -> ${change.after}`;
    default:
      return String(change);
  }
}
