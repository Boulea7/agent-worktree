import { deriveExecutionSessionWaitReadiness } from "./runtime-state-readiness.js";
import type {
  ExecutionSessionWaitReadiness,
  ExecutionSessionSpawnHeadlessWaitCandidate,
  ExecutionSessionSpawnHeadlessWaitCandidateInput
} from "./types.js";

export function deriveExecutionSessionSpawnHeadlessWaitCandidate(
  input: ExecutionSessionSpawnHeadlessWaitCandidateInput
): ExecutionSessionSpawnHeadlessWaitCandidate {
  const readiness = deriveExecutionSessionWaitReadiness({
    context: input.headlessContext.context
  });
  const candidateReadiness: ExecutionSessionWaitReadiness =
    input.headlessContext.headlessView.descendantCoverage === "incomplete"
      ? {
          ...readiness,
          blockingReasons:
            insertIncompleteCoverageBlockingReason(
              readiness.blockingReasons
            ) as ExecutionSessionWaitReadiness["blockingReasons"],
          canWait: false,
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
  blockingReasons: ExecutionSessionWaitReadiness["blockingReasons"]
): ExecutionSessionWaitReadiness["blockingReasons"] {
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
