import type {
  ExecutionCoordinationTaskDetail,
  ExecutionCoordinationTaskFromCloseoutDecisionInput,
  ExecutionCoordinationTaskFromHandoffDecisionInput,
  ExecutionCoordinationTaskFromPromotionDecisionInput,
  ExecutionCoordinationTaskFromSpawnCandidateInput,
  ExecutionCoordinationTaskFromSpawnHeadlessWaitCandidateInput
} from "./types.js";
import { deriveExecutionSessionDescendantCoverageSummary } from "./runtime-state-descendant-coverage.js";

export function deriveExecutionCoordinationTaskDetailFromSpawnCandidate(
  input: ExecutionCoordinationTaskFromSpawnCandidateInput
): ExecutionCoordinationTaskDetail {
  return {
    id: input.id,
    kind: "delegated_work",
    owner: {
      attemptId: input.candidate.context.record.attemptId,
      runtime: input.candidate.context.record.runtime
    },
    blockingReasons: [...input.candidate.readiness.blockingReasons],
    requestedCount: input.requestedCount,
    childCount: input.candidate.budget.childCount,
    ...(input.candidate.budget.lineageDepth === undefined
      ? {}
      : { lineageDepth: input.candidate.budget.lineageDepth }),
    lineageDepthKnown: input.candidate.budget.lineageDepthKnown,
    ...(input.candidate.budget.remainingChildSlots === undefined
      ? {}
      : { remainingChildSlots: input.candidate.budget.remainingChildSlots }),
    ...(input.candidate.budget.remainingDepthAllowance === undefined
      ? {}
      : {
          remainingDepthAllowance:
            input.candidate.budget.remainingDepthAllowance
        })
  };
}

export function deriveExecutionCoordinationTaskDetailFromSpawnHeadlessWaitCandidate(
  input: ExecutionCoordinationTaskFromSpawnHeadlessWaitCandidateInput
): ExecutionCoordinationTaskDetail {
  const coverageSummary = deriveExecutionSessionDescendantCoverageSummary({
    record: input.headlessWaitCandidate.headlessContext.context.record,
    view: input.headlessWaitCandidate.headlessContext.headlessView.view,
    descendantCoverage:
      input.headlessWaitCandidate.headlessContext.headlessView.descendantCoverage
  });

  return {
    id: input.id,
    kind: "blocked_child",
    owner: {
      attemptId: input.headlessWaitCandidate.candidate.context.record.attemptId,
      runtime: input.headlessWaitCandidate.candidate.context.record.runtime
    },
    blockingReasons: [...input.headlessWaitCandidate.candidate.readiness.blockingReasons],
    descendantCoverage: coverageSummary.coverage,
    descendantCoverageDefaulted: coverageSummary.isDefaulted,
    descendantCount: coverageSummary.descendantCount,
    descendantAttemptIds: coverageSummary.descendantAttemptIds
  };
}

export function deriveExecutionCoordinationTaskDetailFromPromotionDecision(
  input: ExecutionCoordinationTaskFromPromotionDecisionInput
): ExecutionCoordinationTaskDetail {
  return {
    id: input.id,
    kind: "verifier_handoff",
    ...(input.summary.selectedIdentity === undefined
      ? {}
      : {
          owner: {
            attemptId: input.summary.selectedIdentity.attemptId,
            runtime: input.summary.selectedIdentity.runtime
          }
        }),
    blockingReasons: [...input.summary.blockingReasons],
    taskId: input.summary.taskId,
    selectedAttemptId: input.summary.selectedAttemptId,
    comparableCandidateCount: input.summary.comparableCandidateCount,
    promotionReadyCandidateCount: input.summary.promotionReadyCandidateCount,
    canAdvance: input.summary.canPromote
  };
}

export function deriveExecutionCoordinationTaskDetailFromHandoffDecision(
  input: ExecutionCoordinationTaskFromHandoffDecisionInput
): ExecutionCoordinationTaskDetail {
  return {
    id: input.id,
    kind: "review_handoff",
    blockingReasons: [...input.summary.blockingReasons],
    resultCount: input.summary.resultCount,
    blockedResultCount: input.summary.blockedResultCount,
    canAdvance: input.summary.canFinalizeHandoff
  };
}

export function deriveExecutionCoordinationTaskDetailFromCloseoutDecision(
  input: ExecutionCoordinationTaskFromCloseoutDecisionInput
): ExecutionCoordinationTaskDetail {
  return {
    id: input.id,
    kind: "closeout_readiness",
    blockingReasons: [...input.summary.blockingReasons],
    resultCount: input.summary.resultCount,
    blockedResultCount: input.summary.blockedResultCount,
    reportingDisposition: input.summary.reportingDisposition,
    canAdvance: input.summary.canAdvanceFromCloseout
  };
}
