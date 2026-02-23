import * as ts from "typescript";
import * as path from "path";
import { extractSymbols } from "./symbolExtractor.js";
import type { ProjectSnapshot, SymbolRegistry } from "../types.js";
import { createEmptyRegistry } from "../model/symbolRegistry.js";

export function analyzeProject(tsConfigPath: string): ProjectSnapshot {
  const configPath = path.resolve(tsConfigPath);
  const configFile = ts.readConfigFile(configPath, ts.sys.readFile);

  if (configFile.error) {
    throw new Error(
      `Failed to read tsconfig: ${ts.formatDiagnostic(configFile.error, {
        getCanonicalFileName: (f) => f,
        getCurrentDirectory: ts.sys.getCurrentDirectory,
        getNewLine: () => ts.sys.newLine,
      })}`
    );
  }

  const parsedConfig = ts.parseJsonConfigFileContent(
    configFile.config,
    ts.sys,
    path.dirname(configPath)
  );

  if (parsedConfig.errors.length > 0) {
    const msg = parsedConfig.errors
      .map((e) =>
        ts.formatDiagnostic(e, {
          getCanonicalFileName: (f) => f,
          getCurrentDirectory: ts.sys.getCurrentDirectory,
          getNewLine: () => ts.sys.newLine,
        })
      )
      .join("\n");
    throw new Error(`Invalid tsconfig: ${msg}`);
  }

  const program = ts.createProgram(
    parsedConfig.fileNames,
    parsedConfig.options,
    ts.createCompilerHost(parsedConfig.options)
  );

  const checker = program.getTypeChecker();
  const registry: SymbolRegistry = createEmptyRegistry();

  for (const sourceFile of program.getSourceFiles()) {
    if (sourceFile.isDeclarationFile) continue;
    if (sourceFile.fileName.includes("node_modules")) continue;

    const isIncluded = parsedConfig.fileNames.some((f) =>
      path.resolve(f) === path.resolve(sourceFile.fileName)
    );
    if (!isIncluded) continue;

    extractSymbols(sourceFile, checker, registry);
  }

  return { symbols: registry };
}
