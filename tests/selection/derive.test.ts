import { describe, expect, it } from "vitest";

import { ValidationError } from "../../src/core/errors.js";
import type { AttemptManifest } from "../../src/manifest/types.js";
import {
  deriveAttemptSelectionCandidate,
  deriveAttemptSelectionResult
} from "../../src/selection/index.js";
import { deriveAttemptVerificationSummary } from "../../src/verification/index.js";

describe("selection helpers", () => {
  it("should derive a selection candidate directly from manifest metadata and verification summary", () => {
    const manifest = createManifest({
      attemptId: "att_candidate",
      status: "running",
      verification: {
        state: "pending",
        checks: [
          {
            name: "lint",
            status: "passed",
            required: true
          },
          {
            name: "unit",
            status: "pending",
            required: true
          }
        ]
      }
    });

    expect(deriveAttemptSelectionCandidate(manifest)).toEqual({
      attemptId: "att_candidate",
      taskId: "task_shared",
      runtime: "codex-cli",
      status: "running",
      sourceKind: "direct",
      summary: deriveAttemptVerificationSummary(manifest.verification)
    });
  });

  it("should return a stable empty selection result for an empty manifest list", () => {
    expect(deriveAttemptSelectionResult([])).toEqual({
      selectionBasis: "verification_summary",
      taskId: undefined,
      candidates: [],
      selected: undefined,
      comparableCandidateCount: 0,
      selectionReadyCandidateCount: 0,
      recommendedForPromotion: false
    });
  });

  it("should derive a stable single-candidate selection result", () => {
    const manifest = createManifest({
      attemptId: "att_ready",
      verification: {
        state: "verified",
        checks: []
      }
    });

    expect(deriveAttemptSelectionResult([manifest])).toEqual({
      selectionBasis: "verification_summary",
      taskId: "task_shared",
      candidates: [deriveAttemptSelectionCandidate(manifest)],
      selected: deriveAttemptSelectionCandidate(manifest),
      comparableCandidateCount: 1,
      selectionReadyCandidateCount: 1,
      recommendedForPromotion: true
    });
  });

  it("should sort candidates best-first using the verification comparator only", () => {
    const manifests = [
      createManifest({
        attemptId: "att_pending",
        status: "failed",
        runtime: "gemini-cli",
        sourceKind: "delegated",
        verification: {
          state: "pending",
          checks: []
        }
      }),
      createManifest({
        attemptId: "att_ready",
        status: "created",
        runtime: "codex-cli",
        sourceKind: "direct",
        verification: {
          state: "verified",
          checks: []
        }
      }),
      createManifest({
        attemptId: "att_incomplete",
        status: "verified",
        runtime: "opencode",
        sourceKind: "fork",
        verification: {
          state: "pending",
          checks: [
            {
              name: "lint",
              status: "passed",
              required: true
            },
            {
              status: "passed"
            }
          ]
        }
      })
    ];

    const result = deriveAttemptSelectionResult(manifests);

    expect(result.candidates.map((candidate) => candidate.attemptId)).toEqual([
      "att_ready",
      "att_pending",
      "att_incomplete"
    ]);
    expect(result.selected?.attemptId).toBe("att_ready");
    expect(result.comparableCandidateCount).toBe(2);
    expect(result.selectionReadyCandidateCount).toBe(1);
    expect(result.recommendedForPromotion).toBe(true);
  });

  it("should fail loudly when manifests from different taskIds are mixed", () => {
    const manifests = [
      createManifest({
        attemptId: "att_a",
        taskId: "task_a"
      }),
      createManifest({
        attemptId: "att_b",
        taskId: "task_b"
      })
    ];

    expect(() => deriveAttemptSelectionResult(manifests)).toThrow(ValidationError);
    expect(() => deriveAttemptSelectionResult(manifests)).toThrow(
      "Attempt selection requires manifests from a single taskId."
    );
  });

  it("should propagate incomplete verification summaries without re-deriving policy in selection", () => {
    const manifest = createManifest({
      attemptId: "att_incomplete",
      verification: {
        state: "pending",
        checks: [
          {
            name: "lint",
            status: "passed",
            required: true
          },
          {
            required: true,
            status: "passed"
          }
        ]
      }
    });

    const result = deriveAttemptSelectionResult([manifest]);

    expect(result.selected?.summary).toEqual({
      sourceState: "pending",
      overallOutcome: "incomplete",
      requiredOutcome: "incomplete",
      counts: {
        total: 2,
        valid: 1,
        invalid: 1,
        required: 1,
        optional: 0,
        passed: 1,
        failed: 0,
        pending: 0,
        skipped: 0,
        error: 0
      },
      hasInvalidChecks: true,
      hasComparablePayload: false,
      isSelectionReady: false
    });
    expect(result.comparableCandidateCount).toBe(0);
    expect(result.selectionReadyCandidateCount).toBe(0);
    expect(result.recommendedForPromotion).toBe(false);
  });

  it("should still return a deterministic selected candidate when every candidate is pending only", () => {
    const manifests = [
      createManifest({
        attemptId: "att_b",
        verification: {
          state: "pending",
          checks: []
        }
      }),
      createManifest({
        attemptId: "att_a",
        verification: {
          state: "pending",
          checks: []
        }
      })
    ];

    const result = deriveAttemptSelectionResult(manifests);

    expect(result.candidates.map((candidate) => candidate.attemptId)).toEqual([
      "att_a",
      "att_b"
    ]);
    expect(result.selected?.attemptId).toBe("att_a");
    expect(result.comparableCandidateCount).toBe(2);
    expect(result.selectionReadyCandidateCount).toBe(0);
    expect(result.recommendedForPromotion).toBe(false);
  });

  it("should use attemptId as the deterministic final tie-break when summaries are identical", () => {
    const manifests = [
      createManifest({
        attemptId: "att_b",
        status: "failed",
        runtime: "gemini-cli",
        sourceKind: "delegated",
        verification: {
          state: "verified",
          checks: []
        }
      }),
      createManifest({
        attemptId: "att_a",
        status: "created",
        runtime: "codex-cli",
        sourceKind: "direct",
        verification: {
          state: "verified",
          checks: []
        }
      })
    ];

    const result = deriveAttemptSelectionResult(manifests);

    expect(result.candidates.map((candidate) => candidate.attemptId)).toEqual([
      "att_a",
      "att_b"
    ]);
    expect(result.selected?.attemptId).toBe("att_a");
  });

  it("should not mutate manifests or the supplied manifest array", () => {
    const firstManifest = {
      ...createManifest({
        attemptId: "att_z",
        verification: {
          state: "pending",
          checks: [
            Object.freeze({
              name: "lint",
              status: "passed",
              required: true
            })
          ]
        }
      }),
      verification: {
        state: "pending",
        checks: [
          Object.freeze({
            name: "lint",
            status: "passed",
            required: true
          })
        ]
      }
    } satisfies AttemptManifest;
    const secondManifest = {
      ...createManifest({
        attemptId: "att_a",
        verification: {
          state: "verified",
          checks: []
        }
      }),
      verification: {
        state: "verified",
        checks: []
      }
    } satisfies AttemptManifest;
    const manifests = [firstManifest, secondManifest];
    const snapshot = structuredClone(manifests);

    expect(() => deriveAttemptSelectionResult(manifests)).not.toThrow();
    expect(manifests).toEqual(snapshot);
    expect(manifests.map((manifest) => manifest.attemptId)).toEqual([
      "att_z",
      "att_a"
    ]);
  });
});

function createManifest(
  overrides: Partial<AttemptManifest> & Pick<AttemptManifest, "attemptId">
): AttemptManifest {
  const {
    attemptId,
    sourceKind,
    status,
    verification,
    ...rest
  } = overrides;

  return {
    adapter: "subprocess",
    attemptId,
    runtime: "codex-cli",
    schemaVersion: "0.x",
    sourceKind: sourceKind ?? "direct",
    status: status ?? "created",
    taskId: "task_shared",
    verification:
      verification ?? {
        state: "verified",
        checks: []
      },
    ...rest
  };
}
