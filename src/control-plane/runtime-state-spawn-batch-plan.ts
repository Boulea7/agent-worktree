import { ValidationError } from "../core/errors.js";
import type {
  ExecutionSessionSpawnBatchPlan,
  ExecutionSessionSpawnBatchPlanInput
} from "./types.js";

export function deriveExecutionSessionSpawnBatchPlan(
  input: ExecutionSessionSpawnBatchPlanInput
): ExecutionSessionSpawnBatchPlan {
  const requestedCount = normalizeRequestedCount(input.requestedCount);
  const remainingChildSlots = input.candidate.budget.remainingChildSlots;
  const fitsRemainingChildSlots =
    remainingChildSlots === undefined
      ? true
      : requestedCount <= remainingChildSlots;

  return {
    candidate: input.candidate,
    requestedCount,
    fitsRemainingChildSlots,
    canPlan: input.candidate.readiness.canSpawn && fitsRemainingChildSlots
  };
}

function normalizeRequestedCount(value: number): number {
  if (!Number.isFinite(value) || !Number.isInteger(value) || value <= 0) {
    throw new ValidationError(
      "Execution session spawn batch plan requestedCount must be a finite integer greater than 0."
    );
  }

  return value;
}
