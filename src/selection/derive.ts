import { ValidationError } from "../core/errors.js";
import {
  attemptSourceKinds,
  attemptStatuses,
  type AttemptManifest,
  type AttemptSourceKind,
  type AttemptStatus
} from "../manifest/types.js";
import {
  compareAttemptVerificationCandidates
} from "../verification/compare.js";
import { deriveAttemptVerificationSummary } from "../verification/derive.js";
import type {
  AttemptSelectionCandidate,
  AttemptSelectionResult
} from "./types.js";

const ATTEMPT_SELECTION_BASIS = "verification_summary" as const;
const validAttemptStatuses = new Set<AttemptStatus>(attemptStatuses);
const validAttemptSourceKinds = new Set<AttemptSourceKind>(attemptSourceKinds);

export function deriveAttemptSelectionCandidate(
  manifest: AttemptManifest
): AttemptSelectionCandidate {
  return {
    attemptId: normalizeRequiredString(manifest.attemptId, "manifest.attemptId"),
    taskId: normalizeRequiredString(manifest.taskId, "manifest.taskId"),
    runtime: normalizeRequiredString(manifest.runtime, "manifest.runtime"),
    status: normalizeAttemptStatus(manifest.status),
    sourceKind: normalizeAttemptSourceKind(manifest.sourceKind),
    summary: deriveAttemptVerificationSummary(manifest.verification)
  };
}

export function deriveAttemptSelectionResult(
  manifests: readonly AttemptManifest[]
): AttemptSelectionResult {
  const firstManifest = manifests[0];

  if (firstManifest === undefined) {
    return {
      selectionBasis: ATTEMPT_SELECTION_BASIS,
      taskId: undefined,
      candidates: [],
      selected: undefined,
      comparableCandidateCount: 0,
      selectionReadyCandidateCount: 0,
      recommendedForPromotion: false
    };
  }

  const taskId = normalizeRequiredString(firstManifest.taskId, "manifest.taskId");
  validateTaskBoundary(manifests, taskId);

  const candidates = manifests.map((manifest) =>
    deriveAttemptSelectionCandidate(manifest)
  );
  const sortedCandidates = [...candidates].sort(
    compareAttemptVerificationCandidates
  );
  const selected = sortedCandidates[0];
  const comparableCandidateCount = sortedCandidates.filter(
    (candidate) => candidate.summary.hasComparablePayload
  ).length;
  const selectionReadyCandidateCount = sortedCandidates.filter(
    (candidate) => candidate.summary.isSelectionReady
  ).length;

  return {
    selectionBasis: ATTEMPT_SELECTION_BASIS,
    taskId,
    candidates: sortedCandidates,
    selected,
    comparableCandidateCount,
    selectionReadyCandidateCount,
    recommendedForPromotion: selected?.summary.isSelectionReady ?? false
  };
}

function validateTaskBoundary(
  manifests: readonly AttemptManifest[],
  taskId: string
): void {
  for (const manifest of manifests) {
    if (normalizeRequiredString(manifest.taskId, "manifest.taskId") !== taskId) {
      throw new ValidationError(
        "Attempt selection requires manifests from a single taskId."
      );
    }
  }
}

function normalizeRequiredString(value: unknown, fieldName: string): string {
  if (typeof value !== "string") {
    throw new ValidationError(
      `Attempt selection requires ${fieldName} to be a non-empty string.`
    );
  }

  const normalized = value.trim();

  if (normalized.length === 0) {
    throw new ValidationError(
      `Attempt selection requires ${fieldName} to be a non-empty string.`
    );
  }

  return normalized;
}

function normalizeAttemptStatus(value: unknown): AttemptStatus {
  if (
    typeof value !== "string" ||
    !validAttemptStatuses.has(value as AttemptStatus)
  ) {
    throw new ValidationError(
      "Attempt selection requires manifest.status to use the existing attempt status vocabulary."
    );
  }

  return value as AttemptStatus;
}

function normalizeAttemptSourceKind(
  value: unknown
): AttemptSourceKind | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (
    typeof value !== "string" ||
    !validAttemptSourceKinds.has(value as AttemptSourceKind)
  ) {
    throw new ValidationError(
      "Attempt selection requires manifest.sourceKind to use the existing attempt source-kind vocabulary when provided."
    );
  }

  return value as AttemptSourceKind;
}
