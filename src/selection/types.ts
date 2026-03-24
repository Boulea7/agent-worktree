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
