import { deriveExecutionSessionWaitReadiness } from "./runtime-state-readiness.js";
import { deriveExecutionSessionDescendantCoverageSummary } from "./runtime-state-descendant-coverage.js";
import { normalizeHeadlessContextWrapper } from "./runtime-state-headless-wrapper-guards.js";
import type {
  ExecutionSessionWaitReadiness,
  ExecutionSessionSpawnHeadlessWaitCandidate,
  ExecutionSessionSpawnHeadlessWaitCandidateInput
} from "./types.js";

export function deriveExecutionSessionSpawnHeadlessWaitCandidate(
  input: ExecutionSessionSpawnHeadlessWaitCandidateInput
): ExecutionSessionSpawnHeadlessWaitCandidate {
  const normalizedInput = normalizeHeadlessContextWrapper(input, {
    context: "Execution session spawn headless wait candidate",
    wrapperKey: "headlessContext"
  });
  const coverageSummary = deriveExecutionSessionDescendantCoverageSummary({
    record: normalizedInput.headlessContext.context.record,
    view: normalizedInput.headlessContext.headlessView.view,
    ...(normalizedInput.headlessContext.headlessView.descendantCoverage === undefined
      ? {}
      : {
          descendantCoverage:
            normalizedInput.headlessContext.headlessView.descendantCoverage
        })
  });
  const candidateReadiness: ExecutionSessionWaitReadiness =
    deriveExecutionSessionWaitReadiness({
      context: normalizedInput.headlessContext.context,
      descendantCoverage: coverageSummary.coverage
    });

  return {
    headlessContext: normalizedInput.headlessContext,
    candidate: {
      context: normalizedInput.headlessContext.context,
      readiness: candidateReadiness
    }
  };
}
