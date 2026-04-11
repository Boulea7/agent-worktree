import type {
  AttemptSourceKind,
  AttemptStatus
} from "../manifest/types.js";
import type {
  AttemptVerificationArtifactSummary,
  AttemptVerificationSummary
} from "../verification/types.js";

export interface AttemptSelectionCandidate {
  attemptId: string;
  taskId: string;
  runtime: string;
  status: AttemptStatus;
  sourceKind: AttemptSourceKind | undefined;
  summary: AttemptVerificationSummary;
}

export interface AttemptSelectionResult {
  selectionBasis: "verification_summary";
  taskId: string | undefined;
  candidates: AttemptSelectionCandidate[];
  selected: AttemptSelectionCandidate | undefined;
  comparableCandidateCount: number;
  selectionReadyCandidateCount: number;
  recommendedForPromotion: boolean;
}

export interface AttemptPromotionCandidate {
  promotionBasis: "verification_artifact_summary";
  attemptId: string;
  taskId: string;
  runtime: string;
  status: AttemptStatus;
  sourceKind: AttemptSourceKind | undefined;
  summary: AttemptVerificationSummary;
  artifactSummary: AttemptVerificationArtifactSummary;
  recommendedForPromotion: boolean;
}

export interface AttemptPromotionResult {
  promotionResultBasis: "promotion_candidate";
  taskId: string | undefined;
  candidates: AttemptPromotionCandidate[];
  selected: AttemptPromotionCandidate | undefined;
  comparableCandidateCount: number;
  promotionReadyCandidateCount: number;
  recommendedForPromotion: boolean;
}

export interface AttemptPromotionAuditCandidate {
  attemptId: string;
  runtime: string;
  status: AttemptStatus;
  sourceKind: AttemptSourceKind | undefined;
  summary: AttemptVerificationSummary;
  recommendedForPromotion: boolean;
  blockingRequiredCheckNames: string[];
  failedOrErrorCheckNames: string[];
  pendingCheckNames: string[];
  skippedCheckNames: string[];
}

export interface AttemptPromotionAuditSummary {
  auditBasis: "promotion_result";
  taskId: string | undefined;
  selectedAttemptId: string | undefined;
  candidateCount: number;
  comparableCandidateCount: number;
  promotionReadyCandidateCount: number;
  recommendedForPromotion: boolean;
  candidates: AttemptPromotionAuditCandidate[];
}

export interface AttemptPromotionReport {
  reportBasis: "promotion_audit_summary";
  taskId: string | undefined;
  selectedAttemptId: string | undefined;
  candidateCount: number;
  comparableCandidateCount: number;
  promotionReadyCandidateCount: number;
  recommendedForPromotion: boolean;
  candidates: AttemptPromotionAuditCandidate[];
  selected: AttemptPromotionAuditCandidate | undefined;
  promotionReadyCandidates: AttemptPromotionAuditCandidate[];
  nonPromotionReadyCandidates: AttemptPromotionAuditCandidate[];
  pendingCandidates: AttemptPromotionAuditCandidate[];
}

export type AttemptPromotionExplanationCode =
  | "selected"
  | "promotion_ready"
  | "required_checks_failed"
  | "required_checks_pending"
  | "verification_incomplete";

export interface AttemptPromotionExplanationCandidate {
  attemptId: string;
  runtime: string;
  status: AttemptStatus;
  sourceKind: AttemptSourceKind | undefined;
  hasComparablePayload: boolean;
  isSelected: boolean;
  recommendedForPromotion: boolean;
  explanationCode: AttemptPromotionExplanationCode;
  blockingRequiredCheckNames: string[];
  failedOrErrorCheckNames: string[];
  pendingCheckNames: string[];
  skippedCheckNames: string[];
}

export interface AttemptPromotionExplanationSummary {
  explanationBasis: "promotion_report";
  taskId: string | undefined;
  selectedAttemptId: string | undefined;
  candidateCount: number;
  comparableCandidateCount: number;
  promotionReadyCandidateCount: number;
  recommendedForPromotion: boolean;
  selected: AttemptPromotionExplanationCandidate | undefined;
  candidates: AttemptPromotionExplanationCandidate[];
}

export type AttemptPromotionDecisionBlockingReason =
  | "no_candidates"
  | "required_checks_failed"
  | "required_checks_pending"
  | "verification_incomplete";

export interface AttemptPromotionDecisionSummary {
  decisionBasis: "promotion_explanation_summary";
  taskId: string | undefined;
  selectedAttemptId: string | undefined;
  candidateCount: number;
  comparableCandidateCount: number;
  promotionReadyCandidateCount: number;
  recommendedForPromotion: boolean;
  selected: AttemptPromotionExplanationCandidate | undefined;
  blockingReasons: AttemptPromotionDecisionBlockingReason[];
  canPromote: boolean;
  hasBlockingReasons: boolean;
}

export interface AttemptPromotionTarget {
  targetBasis: "promotion_decision_summary";
  taskId: string;
  attemptId: string;
  runtime: string;
  status: AttemptStatus;
  sourceKind: AttemptSourceKind | undefined;
}

export interface AttemptHandoffTarget {
  handoffBasis: "promotion_target";
  taskId: string;
  attemptId: string;
  runtime: string;
  status: AttemptStatus;
  sourceKind: AttemptSourceKind | undefined;
}

export interface AttemptHandoffRequest {
  taskId: string;
  attemptId: string;
  runtime: string;
  status: AttemptStatus;
  sourceKind: AttemptSourceKind | undefined;
}

export type AttemptHandoffConsumerBlockingReason = "handoff_unsupported";

export interface AttemptHandoffCapabilityResolver {
  (runtime: string): boolean;
}

export interface AttemptHandoffConsumerReadiness {
  blockingReasons: AttemptHandoffConsumerBlockingReason[];
  canConsumeHandoff: boolean;
  hasBlockingReasons: boolean;
  handoffSupported: boolean;
}

export interface AttemptHandoffConsumer {
  request: AttemptHandoffRequest;
  readiness: AttemptHandoffConsumerReadiness;
}

export interface AttemptHandoffInvoker {
  (request: AttemptHandoffRequest): void | Promise<void>;
}

export interface AttemptHandoffConsumeInput {
  consumer: AttemptHandoffConsumer;
  invokeHandoff: AttemptHandoffInvoker;
}

export interface AttemptHandoffConsume {
  request: AttemptHandoffRequest;
  readiness: AttemptHandoffConsumerReadiness;
  invoked: boolean;
}

export interface AttemptHandoffConsumeBatchInput {
  consumers: readonly AttemptHandoffConsumer[];
  invokeHandoff: AttemptHandoffInvoker;
}

export interface AttemptHandoffConsumeBatch {
  results: AttemptHandoffConsume[];
}

export interface AttemptHandoffApplyInput {
  request: AttemptHandoffRequest | undefined;
  invokeHandoff: AttemptHandoffInvoker;
  resolveHandoffCapability?: AttemptHandoffCapabilityResolver;
}

export interface AttemptHandoffApply {
  consumer: AttemptHandoffConsumer;
  consume: AttemptHandoffConsume;
}

export interface AttemptHandoffApplyBatchInput {
  requests: readonly AttemptHandoffRequest[];
  invokeHandoff: AttemptHandoffInvoker;
  resolveHandoffCapability?: AttemptHandoffCapabilityResolver;
}

export interface AttemptHandoffApplyBatch {
  results: AttemptHandoffApply[];
}

export interface AttemptHandoffTargetApplyInput {
  target: AttemptHandoffTarget | undefined;
  invokeHandoff: AttemptHandoffInvoker;
  resolveHandoffCapability?: AttemptHandoffCapabilityResolver;
}

export interface AttemptHandoffTargetApply {
  request: AttemptHandoffRequest;
  apply: AttemptHandoffApply;
}

export interface AttemptHandoffTargetApplyBatchInput {
  targets: readonly AttemptHandoffTarget[];
  invokeHandoff: AttemptHandoffInvoker;
  resolveHandoffCapability?: AttemptHandoffCapabilityResolver;
}

export interface AttemptHandoffTargetApplyBatch {
  results: AttemptHandoffTargetApply[];
}

export interface AttemptPromotionTargetApplyInput {
  target: AttemptPromotionTarget | undefined;
  invokeHandoff: AttemptHandoffInvoker;
  resolveHandoffCapability?: AttemptHandoffCapabilityResolver;
}

export interface AttemptPromotionTargetApply {
  handoffTarget: AttemptHandoffTarget;
  targetApply: AttemptHandoffTargetApply;
}

export interface AttemptPromotionTargetApplyBatchInput {
  targets: readonly AttemptPromotionTarget[];
  invokeHandoff: AttemptHandoffInvoker;
  resolveHandoffCapability?: AttemptHandoffCapabilityResolver;
}

export interface AttemptPromotionTargetApplyBatch {
  results: AttemptPromotionTargetApply[];
}

export interface AttemptHandoffReportReadyEntry {
  handoffTarget: AttemptHandoffTarget;
  targetApply: AttemptHandoffTargetApply;
}

export interface AttemptHandoffReportReady {
  reportBasis: "promotion_target_apply_batch";
  results: AttemptHandoffReportReadyEntry[];
  invokedResults: AttemptHandoffReportReadyEntry[];
  blockedResults: AttemptHandoffReportReadyEntry[];
}

export type AttemptHandoffExplanationCode =
  | "handoff_invoked"
  | "handoff_blocked_unsupported";

export interface AttemptHandoffExplanationEntry {
  handoffTarget: AttemptHandoffTarget;
  targetApply: AttemptHandoffTargetApply;
  explanationCode: AttemptHandoffExplanationCode;
  invoked: boolean;
  blockingReasons: AttemptHandoffConsumerBlockingReason[];
}

export interface AttemptHandoffExplanationSummary {
  explanationBasis: "handoff_report_ready";
  results: AttemptHandoffExplanationEntry[];
  invokedResults: AttemptHandoffExplanationEntry[];
  blockedResults: AttemptHandoffExplanationEntry[];
}

export type AttemptHandoffDecisionBlockingReason =
  | "no_results"
  | "handoff_unsupported";

export interface AttemptHandoffDecisionSummary {
  decisionBasis: "handoff_explanation_summary";
  resultCount: number;
  invokedResultCount: number;
  blockedResultCount: number;
  blockingReasons: AttemptHandoffDecisionBlockingReason[];
  canFinalizeHandoff: boolean;
  hasBlockingReasons: boolean;
}

export interface AttemptHandoffFinalizationTarget {
  taskId: string;
  attemptId: string;
  runtime: string;
  status: AttemptStatus;
  sourceKind: AttemptSourceKind | undefined;
}

export interface AttemptHandoffFinalizationTargetSummary {
  finalizationBasis: "handoff_decision_summary";
  resultCount: number;
  invokedResultCount: number;
  blockedResultCount: number;
  blockingReasons: AttemptHandoffDecisionBlockingReason[];
  canFinalizeHandoff: boolean;
  targets: AttemptHandoffFinalizationTarget[];
}

export interface AttemptHandoffFinalizationRequest {
  taskId: string;
  attemptId: string;
  runtime: string;
  status: AttemptStatus;
  sourceKind: AttemptSourceKind | undefined;
}

export interface AttemptHandoffFinalizationRequestSummary {
  requestBasis: "handoff_finalization_target_summary";
  resultCount: number;
  invokedResultCount: number;
  blockedResultCount: number;
  blockingReasons: AttemptHandoffDecisionBlockingReason[];
  canFinalizeHandoff: boolean;
  requests: AttemptHandoffFinalizationRequest[];
}

export type AttemptHandoffFinalizationConsumerBlockingReason =
  "handoff_finalization_unsupported";

export interface AttemptHandoffFinalizationCapabilityResolver {
  (runtime: string): boolean;
}

export interface AttemptHandoffFinalizationConsumerReadiness {
  blockingReasons: AttemptHandoffFinalizationConsumerBlockingReason[];
  canConsumeHandoffFinalization: boolean;
  hasBlockingReasons: boolean;
  handoffFinalizationSupported: boolean;
}

export interface AttemptHandoffFinalizationConsumer {
  request: AttemptHandoffFinalizationRequest;
  readiness: AttemptHandoffFinalizationConsumerReadiness;
}

export interface AttemptHandoffFinalizationInvoker {
  (request: AttemptHandoffFinalizationRequest): void | Promise<void>;
}

export interface AttemptHandoffFinalizationConsumeInput {
  consumer: AttemptHandoffFinalizationConsumer;
  invokeHandoffFinalization: AttemptHandoffFinalizationInvoker;
}

export interface AttemptHandoffFinalizationConsume {
  request: AttemptHandoffFinalizationRequest;
  readiness: AttemptHandoffFinalizationConsumerReadiness;
  invoked: boolean;
}

export interface AttemptHandoffFinalizationConsumeBatchInput {
  consumers: readonly AttemptHandoffFinalizationConsumer[];
  invokeHandoffFinalization: AttemptHandoffFinalizationInvoker;
}

export interface AttemptHandoffFinalizationConsumeBatch {
  results: AttemptHandoffFinalizationConsume[];
}

export interface AttemptHandoffFinalizationApplyInput {
  request: AttemptHandoffFinalizationRequest | undefined;
  invokeHandoffFinalization: AttemptHandoffFinalizationInvoker;
  resolveHandoffFinalizationCapability?: AttemptHandoffFinalizationCapabilityResolver;
}

export interface AttemptHandoffFinalizationApply {
  consumer: AttemptHandoffFinalizationConsumer;
  consume: AttemptHandoffFinalizationConsume;
}

export interface AttemptHandoffFinalizationApplyBatchInput {
  requests: readonly AttemptHandoffFinalizationRequest[];
  invokeHandoffFinalization: AttemptHandoffFinalizationInvoker;
  resolveHandoffFinalizationCapability?: AttemptHandoffFinalizationCapabilityResolver;
}

export interface AttemptHandoffFinalizationApplyBatch {
  results: AttemptHandoffFinalizationApply[];
}

export interface AttemptHandoffFinalizationRequestSummaryApplyInput {
  summary: AttemptHandoffFinalizationRequestSummary | undefined;
  invokeHandoffFinalization: AttemptHandoffFinalizationInvoker;
  resolveHandoffFinalizationCapability?: AttemptHandoffFinalizationCapabilityResolver;
}

export interface AttemptHandoffFinalizationOutcome {
  taskId: string;
  attemptId: string;
  runtime: string;
  status: AttemptStatus;
  sourceKind: AttemptSourceKind | undefined;
  invoked: boolean;
  blockingReasons: AttemptHandoffFinalizationConsumerBlockingReason[];
}

export interface AttemptHandoffFinalizationOutcomeSummary {
  outcomeBasis: "handoff_finalization_apply_batch";
  resultCount: number;
  invokedResultCount: number;
  blockedResultCount: number;
  blockingReasons: AttemptHandoffFinalizationConsumerBlockingReason[];
  outcomes: AttemptHandoffFinalizationOutcome[];
}

export type AttemptHandoffFinalizationExplanationCode =
  | "handoff_finalization_invoked"
  | "handoff_finalization_blocked_unsupported";

export interface AttemptHandoffFinalizationExplanationEntry {
  outcome: AttemptHandoffFinalizationOutcome;
  explanationCode: AttemptHandoffFinalizationExplanationCode;
  invoked: boolean;
  blockingReasons: AttemptHandoffFinalizationConsumerBlockingReason[];
}

export interface AttemptHandoffFinalizationExplanationSummary {
  explanationBasis: "handoff_finalization_outcome_summary";
  results: AttemptHandoffFinalizationExplanationEntry[];
  invokedResults: AttemptHandoffFinalizationExplanationEntry[];
  blockedResults: AttemptHandoffFinalizationExplanationEntry[];
}

export interface AttemptHandoffFinalizationReportReadyEntry {
  taskId: string;
  attemptId: string;
  runtime: string;
  status: AttemptStatus;
  sourceKind: AttemptSourceKind | undefined;
  explanationCode: AttemptHandoffFinalizationExplanationCode;
  invoked: boolean;
  blockingReasons: AttemptHandoffFinalizationConsumerBlockingReason[];
}

export interface AttemptHandoffFinalizationReportReady {
  reportBasis: "handoff_finalization_explanation_summary";
  results: AttemptHandoffFinalizationReportReadyEntry[];
  invokedResults: AttemptHandoffFinalizationReportReadyEntry[];
  blockedResults: AttemptHandoffFinalizationReportReadyEntry[];
}

export interface AttemptHandoffFinalizationGroupedProjectionGroup {
  groupKey: AttemptHandoffFinalizationExplanationCode;
  resultCount: number;
  invokedResultCount: number;
  blockedResultCount: number;
  results: AttemptHandoffFinalizationReportReadyEntry[];
}

export interface AttemptHandoffFinalizationGroupedProjectionSummary {
  groupedProjectionBasis: "handoff_finalization_report_ready";
  resultCount: number;
  invokedResultCount: number;
  blockedResultCount: number;
  groups: AttemptHandoffFinalizationGroupedProjectionGroup[];
}

export interface AttemptHandoffFinalizationGroupedReportingGroup {
  groupKey: AttemptHandoffFinalizationExplanationCode;
  resultCount: number;
  invokedResultCount: number;
  blockedResultCount: number;
}

export interface AttemptHandoffFinalizationGroupedReportingSummary {
  groupedReportingBasis: "handoff_finalization_grouped_projection_summary";
  resultCount: number;
  invokedResultCount: number;
  blockedResultCount: number;
  groups: AttemptHandoffFinalizationGroupedReportingGroup[];
}

export interface AttemptHandoffFinalizationGroupedReportingDispositionSummary {
  groupedReportingDispositionBasis: "handoff_finalization_grouped_reporting_summary";
  resultCount: number;
  invokedResultCount: number;
  blockedResultCount: number;
  groupCount: number;
  reportingDisposition: "empty" | "all_invoked" | "all_blocked" | "mixed";
}

export interface AttemptHandoffFinalizationClosureSummary {
  closureBasis: "handoff_finalization_grouped_reporting_disposition_summary";
  resultCount: number;
  invokedResultCount: number;
  blockedResultCount: number;
  groupCount: number;
  reportingDisposition: "empty" | "all_invoked" | "all_blocked" | "mixed";
  hasResults: boolean;
  allResultsInvoked: boolean;
  allResultsBlocked: boolean;
  hasMixedDisposition: boolean;
}

export type AttemptHandoffFinalizationCloseoutDecisionBlockingReason =
  | "no_results"
  | "handoff_finalization_unsupported"
  | "handoff_finalization_mixed_disposition";

export interface AttemptHandoffFinalizationCloseoutDecisionSummary {
  decisionBasis: "handoff_finalization_closure_summary";
  resultCount: number;
  invokedResultCount: number;
  blockedResultCount: number;
  groupCount: number;
  reportingDisposition: "empty" | "all_invoked" | "all_blocked" | "mixed";
  blockingReasons: AttemptHandoffFinalizationCloseoutDecisionBlockingReason[];
  canAdvanceFromCloseout: boolean;
  hasBlockingReasons: boolean;
}
