import { deriveExecutionSessionCloseReadiness } from "./runtime-state-close-readiness.js";
import { deriveExecutionSessionDescendantCoverageSummary } from "./runtime-state-descendant-coverage.js";
import { normalizeHeadlessContextWrapper } from "./runtime-state-headless-wrapper-guards.js";
import type {
  ExecutionSessionCloseReadiness,
  ExecutionSessionSpawnHeadlessCloseCandidate,
  ExecutionSessionSpawnHeadlessCloseCandidateInput
} from "./types.js";

export function deriveExecutionSessionSpawnHeadlessCloseCandidate(
  input: ExecutionSessionSpawnHeadlessCloseCandidateInput
): ExecutionSessionSpawnHeadlessCloseCandidate {
  const normalizedInput = normalizeHeadlessContextWrapper(input, {
    context: "Execution session spawn headless close candidate",
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
  const candidateReadiness: ExecutionSessionCloseReadiness =
    deriveExecutionSessionCloseReadiness({
      context: normalizedInput.headlessContext.context,
      descendantCoverage: coverageSummary.coverage,
      ...(normalizedInput.resolveSessionLifecycleCapability === undefined
        ? {}
        : {
            resolveSessionLifecycleCapability:
              normalizedInput.resolveSessionLifecycleCapability
          })
    });

  return {
    headlessContext: normalizedInput.headlessContext,
    candidate: {
      context: normalizedInput.headlessContext.context,
      readiness: candidateReadiness
    }
  };
}
