import type {
  FunctionSignature,
  ParameterSignature,
  SignatureChange,
} from "../types.js";

export function compareSignatures(
  before: FunctionSignature,
  after: FunctionSignature
): SignatureChange[] {
  const changes: SignatureChange[] = [];

  const beforeParams = new Map(before.parameters.map((p) => [p.name, p]));
  const afterParams = new Map(after.parameters.map((p) => [p.name, p]));

  for (const [name, afterParam] of afterParams) {
    const beforeParam = beforeParams.get(name);
    if (!beforeParam) {
      changes.push({
        type: "parameter-added",
        parameter: afterParam,
        breaking: !afterParam.optional,
      });
    } else if (!paramsEqual(beforeParam, afterParam)) {
      changes.push({
        type: "parameter-type-changed",
        before: beforeParam,
        after: afterParam,
        breaking: true,
      });
    }
  }

  for (const [name, beforeParam] of beforeParams) {
    if (!afterParams.has(name)) {
      changes.push({
        type: "parameter-removed",
        parameter: beforeParam,
        breaking: true,
      });
    }
  }

  const beforeReturn = normalizeForComparison(before.returnType);
  const afterReturn = normalizeForComparison(after.returnType);
  if (beforeReturn !== afterReturn) {
    changes.push({
      type: "return-type-changed",
      before: before.returnType,
      after: after.returnType,
      breaking: true,
    });
  }

  return changes;
}

function paramsEqual(a: ParameterSignature, b: ParameterSignature): boolean {
  return (
    a.name === b.name &&
    a.optional === b.optional &&
    normalizeForComparison(a.type) === normalizeForComparison(b.type)
  );
}

function normalizeForComparison(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}
