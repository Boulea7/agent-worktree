import { ValidationError } from "../core/errors.js";
import {
  normalizeBatchWrapper,
} from "./runtime-state-batch-wrapper-guards.js";
import { deriveExecutionSessionCandidateContext } from "./runtime-state-candidate-context.js";
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
  const context = deriveExecutionSessionCandidateContext(normalizedInput, {
    input: "Execution session spawn candidate input must be an object.",
    selector: "Execution session spawn candidate requires selector to be an object.",
    view: "Execution session spawn candidate requires view to be an object."
  });

  if (context === undefined) {
    return undefined;
  }

  const budget = deriveExecutionSessionSpawnBudget({
    context,
    view: normalizedInput.view
  });

  return {
    budget,
    context,
    readiness: deriveExecutionSessionSpawnReadiness({
      context,
      view: normalizedInput.view
    })
  };
}
