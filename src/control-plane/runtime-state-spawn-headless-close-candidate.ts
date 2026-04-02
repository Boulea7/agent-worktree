import { deriveExecutionSessionCloseReadiness } from "./runtime-state-close-readiness.js";
import type {
  ExecutionSessionCloseReadiness,
  ExecutionSessionSpawnHeadlessCloseCandidate,
  ExecutionSessionSpawnHeadlessCloseCandidateInput
} from "./types.js";

export function deriveExecutionSessionSpawnHeadlessCloseCandidate(
  input: ExecutionSessionSpawnHeadlessCloseCandidateInput
): ExecutionSessionSpawnHeadlessCloseCandidate {
  const readiness = deriveExecutionSessionCloseReadiness({
    context: input.headlessContext.context,
    ...(input.resolveSessionLifecycleCapability === undefined
      ? {}
      : {
          resolveSessionLifecycleCapability:
            input.resolveSessionLifecycleCapability
        })
  });
  const candidateReadiness: ExecutionSessionCloseReadiness =
    input.headlessContext.headlessView.descendantCoverage === "incomplete"
      ? {
          ...readiness,
          blockingReasons:
            insertIncompleteCoverageBlockingReason(
              readiness.blockingReasons
            ) as ExecutionSessionCloseReadiness["blockingReasons"],
          canClose: false,
          hasBlockingReasons: true
        }
      : readiness;

  return {
    headlessContext: input.headlessContext,
    candidate: {
      context: input.headlessContext.context,
      readiness: candidateReadiness
    }
  };
}

function insertIncompleteCoverageBlockingReason(
  blockingReasons: ExecutionSessionCloseReadiness["blockingReasons"]
): ExecutionSessionCloseReadiness["blockingReasons"] {
  const childAttemptIndex = blockingReasons.indexOf("child_attempts_present");

  if (childAttemptIndex === -1) {
    return [...blockingReasons, "descendant_coverage_incomplete"];
  }

  return [
    ...blockingReasons.slice(0, childAttemptIndex),
    "descendant_coverage_incomplete",
    ...blockingReasons.slice(childAttemptIndex)
  ];
}
