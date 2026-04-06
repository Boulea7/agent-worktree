import { deriveExecutionSessionLifecycleDisposition } from "./runtime-state-lifecycle-disposition.js";
import { deriveExecutionSessionSpawnBudget } from "./runtime-state-spawn-budget.js";
import type {
  ExecutionSessionSpawnBlockingReason,
  ExecutionSessionSpawnReadiness,
  ExecutionSessionSpawnReadinessInput
} from "./types.js";

export function deriveExecutionSessionSpawnReadiness(
  input: ExecutionSessionSpawnReadinessInput
): ExecutionSessionSpawnReadiness {
  const disposition = deriveExecutionSessionLifecycleDisposition({
    context: input.context
  });
  const budget = deriveExecutionSessionSpawnBudget(input);
  const blockingReasons: ExecutionSessionSpawnBlockingReason[] = [];

  if (disposition.alreadyFinal) {
    blockingReasons.push("lifecycle_terminal");
  }

  if (!disposition.hasKnownSession) {
    blockingReasons.push("session_unknown");
  }

  if (budget.maxDepth !== undefined && !budget.lineageDepthKnown) {
    blockingReasons.push("lineage_depth_unknown");
  }

  if (budget.maxDepth !== undefined && budget.lineageDepthKnown && !budget.withinDepthLimit) {
    blockingReasons.push("depth_limit_reached");
  }

  if (!budget.withinChildLimit) {
    blockingReasons.push("child_limit_reached");
  }

  return {
    blockingReasons,
    canSpawn: blockingReasons.length === 0,
    hasBlockingReasons: blockingReasons.length > 0,
    lineageDepth: budget.lineageDepth,
    lineageDepthKnown: budget.lineageDepthKnown,
    withinChildLimit: budget.withinChildLimit,
    withinDepthLimit: budget.withinDepthLimit
  };
}
