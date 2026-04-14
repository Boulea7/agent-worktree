import { ValidationError } from "../core/errors.js";
import {
  normalizeBatchWrapper,
  readRequiredBatchWrapperProperty
} from "./runtime-state-batch-wrapper-guards.js";
import { deriveExecutionSessionContext } from "./runtime-state-context.js";
import { deriveExecutionSessionSpawnBudget } from "./runtime-state-spawn-budget.js";
import { deriveExecutionSessionSpawnReadiness } from "./runtime-state-spawn-readiness.js";
import type {
  ExecutionSessionSpawnCandidate,
  ExecutionSessionSpawnCandidateInput
} from "./types.js";

export function deriveExecutionSessionSpawnCandidate(
  input: ExecutionSessionSpawnCandidateInput
): ExecutionSessionSpawnCandidate | undefined {
  const normalizedInput = normalizeBatchWrapper<ExecutionSessionSpawnCandidateInput>(
    input,
    "Execution session spawn candidate input must be an object."
  );
  const selector = readRequiredBatchWrapperProperty<
    ExecutionSessionSpawnCandidateInput["selector"]
  >(
    normalizedInput,
    "selector",
    "Execution session spawn candidate requires selector to be an object."
  );
  if (
    typeof selector !== "object" ||
    selector === null ||
    Array.isArray(selector)
  ) {
    throw new ValidationError(
      "Execution session spawn candidate requires selector to be an object."
    );
  }
  const view = readRequiredBatchWrapperProperty<
    ExecutionSessionSpawnCandidateInput["view"]
  >(
    normalizedInput,
    "view",
    "Execution session spawn candidate requires view to be an object."
  );
  if (typeof view !== "object" || view === null || Array.isArray(view)) {
    throw new ValidationError(
      "Execution session spawn candidate requires view to be an object."
    );
  }
  const context = deriveExecutionSessionContext({
    view,
    selector
  });

  if (context === undefined) {
    return undefined;
  }

  const budget = deriveExecutionSessionSpawnBudget({
    context,
    view
  });

  return {
    budget,
    context,
    readiness: deriveExecutionSessionSpawnReadiness({
      context,
      view
    })
  };
}
