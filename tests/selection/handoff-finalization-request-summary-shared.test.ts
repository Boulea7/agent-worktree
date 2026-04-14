import { describe, expect, it } from "vitest";

import { ValidationError } from "../../src/core/errors.js";
import type {
  AttemptSourceKind,
  AttemptStatus
} from "../../src/manifest/types.js";
import {
  attemptHandoffFinalizationRequestBasis,
  deriveCanonicalAttemptHandoffDecisionBlockingReasons,
  validateAttemptHandoffFinalizationRequestSummaryForApply
} from "../../src/selection/handoff-finalization-request-summary-shared.js";
import type {
  AttemptHandoffDecisionBlockingReason,
  AttemptHandoffFinalizationRequest,
  AttemptHandoffFinalizationRequestSummary
} from "../../src/selection/types.js";

describe("selection handoff-finalization-request-summary-shared helpers", () => {
  it("should derive canonical handoff decision blocking reasons from result counts", () => {
    expect(
      deriveCanonicalAttemptHandoffDecisionBlockingReasons(0, 0)
    ).toEqual(["no_results"]);
    expect(
      deriveCanonicalAttemptHandoffDecisionBlockingReasons(2, 0)
    ).toEqual(["handoff_unsupported"]);
    expect(
      deriveCanonicalAttemptHandoffDecisionBlockingReasons(2, 1)
    ).toEqual([]);
  });

  it("should accept canonical request summaries for both blocked and invokable paths", () => {
    expect(() =>
      validateAttemptHandoffFinalizationRequestSummaryForApply(
        createSummary({
          resultCount: 0,
          invokedResultCount: 0,
          blockedResultCount: 0,
          blockingReasons: ["no_results"],
          canFinalizeHandoff: false,
          requests: []
        })
      )
    ).not.toThrow();

    expect(() =>
      validateAttemptHandoffFinalizationRequestSummaryForApply(createSummary())
    ).not.toThrow();
  });

  it("should reject invalid request basis and invalid blocker vocabulary", () => {
    expect(() =>
      validateAttemptHandoffFinalizationRequestSummaryForApply(
        createSummary({
          requestBasis: "shadow_basis" as never
        })
      )
    ).toThrow(
      'Attempt handoff finalization request apply requires summary.requestBasis to be "handoff_finalization_target_summary".'
    );

    expect(() =>
      validateAttemptHandoffFinalizationRequestSummaryForApply(
        createSummary({
          resultCount: 0,
          invokedResultCount: 0,
          blockedResultCount: 0,
          canFinalizeHandoff: false,
          requests: [],
          blockingReasons: ["shadow_reason" as never]
        })
      )
    ).toThrow(
      "Attempt handoff finalization request apply requires summary.blockingReasons to use the existing handoff decision blocker vocabulary."
    );
  });

  it("should reject inconsistent counts and request/canFinalize combinations", () => {
    expect(() =>
      validateAttemptHandoffFinalizationRequestSummaryForApply(
        createSummary({
          resultCount: 2,
          invokedResultCount: 1,
          blockedResultCount: 0
        })
      )
    ).toThrow(
      "Attempt handoff finalization request apply requires summary.resultCount to equal summary.invokedResultCount plus summary.blockedResultCount."
    );

    expect(() =>
      validateAttemptHandoffFinalizationRequestSummaryForApply(
        createSummary({
          requests: []
        })
      )
    ).toThrow(
      "Attempt handoff finalization request apply requires summary.requests to be non-empty when summary.canFinalizeHandoff is true."
    );

    expect(() =>
      validateAttemptHandoffFinalizationRequestSummaryForApply(
        createSummary({
          invokedResultCount: 0
        })
      )
    ).toThrow(
      "Attempt handoff finalization request apply requires summary.invokedResultCount to match summary.requests.length."
    );

    expect(() =>
      validateAttemptHandoffFinalizationRequestSummaryForApply(
        createSummary({
          canFinalizeHandoff: false
        })
      )
    ).toThrow(
      "Attempt handoff finalization request apply requires summary.requests to be empty when summary.canFinalizeHandoff is false."
    );

    expect(() =>
      validateAttemptHandoffFinalizationRequestSummaryForApply(
        createSummary({
          resultCount: 1,
          invokedResultCount: 0,
          blockedResultCount: 1,
          canFinalizeHandoff: false,
          requests: []
        })
      )
    ).toThrow(
      "Attempt handoff finalization request apply requires summary.blockingReasons to match the canonical blocker derivation from summary result counts."
    );

    expect(() =>
      validateAttemptHandoffFinalizationRequestSummaryForApply(
        createSummary({
          blockingReasons: ["handoff_unsupported"],
          canFinalizeHandoff: true
        })
      )
    ).toThrow(
      "Attempt handoff finalization request apply requires summary.blockingReasons to match the canonical blocker derivation from summary result counts."
    );
  });

  it("should reject malformed top-level request summary containers and scalars", () => {
    expect(() =>
      validateAttemptHandoffFinalizationRequestSummaryForApply(undefined as never)
    ).toThrow(
      "Attempt handoff finalization request apply requires summary to be an object."
    );

    expect(() =>
      validateAttemptHandoffFinalizationRequestSummaryForApply(
        createSummary({
          requests: undefined as never
        })
      )
    ).toThrow(
      "Attempt handoff finalization request apply requires summary.requests to be an array."
    );

    expect(() =>
      validateAttemptHandoffFinalizationRequestSummaryForApply(
        createSummary({
          canFinalizeHandoff: "yes" as never
        })
      )
    ).toThrow(
      "Attempt handoff finalization request apply requires summary.canFinalizeHandoff to be a boolean."
    );

    expect(() =>
      validateAttemptHandoffFinalizationRequestSummaryForApply(
        createSummary({
          resultCount: -1
        })
      )
    ).toThrow(
      "Attempt handoff finalization request apply requires summary.resultCount to be a non-negative integer."
    );
  });

  it("should fail closed when reading top-level summary fields through accessor-shaped inputs", () => {
    expect(() =>
      validateAttemptHandoffFinalizationRequestSummaryForApply({
        get requestBasis() {
          throw new Error("getter boom");
        }
      } as never)
    ).toThrow(ValidationError);
    expect(() =>
      validateAttemptHandoffFinalizationRequestSummaryForApply({
        get requestBasis() {
          throw new Error("getter boom");
        }
      } as never)
    ).toThrow(
      "Attempt handoff finalization request apply requires summary to be a readable object."
    );
  });

  it("should reject malformed request entries before apply-side consumers see them", () => {
    expect(() =>
      validateAttemptHandoffFinalizationRequestSummaryForApply(
        createSummary({
          requests: [
            createRequest({
              taskId: "   "
            })
          ]
        })
      )
    ).toThrow(
      "Attempt handoff finalization request apply requires summary.requests entries to use non-empty taskId strings."
    );

    expect(() =>
      validateAttemptHandoffFinalizationRequestSummaryForApply(
        createSummary({
          requests: [
            createRequest({
              status: "invalid" as never
            })
          ]
        })
      )
    ).toThrow(
      "Attempt handoff finalization request apply requires summary.requests entries to use the existing attempt status vocabulary."
    );

    expect(() =>
      validateAttemptHandoffFinalizationRequestSummaryForApply(
        createSummary({
          requests: [
            createRequest({
              sourceKind: "bogus" as never
            })
          ]
        })
      )
    ).toThrow(
      "Attempt handoff finalization request apply requires summary.requests entries to use the existing attempt source-kind vocabulary when provided."
    );
  });

  it("should reject inherited request containers and inherited request entry indexes", () => {
    const inheritedSummary = Object.create({
      requestBasis: attemptHandoffFinalizationRequestBasis,
      resultCount: 1,
      invokedResultCount: 1,
      blockedResultCount: 0,
      blockingReasons: [],
      canFinalizeHandoff: true,
      requests: [createRequest()]
    });

    expect(() =>
      validateAttemptHandoffFinalizationRequestSummaryForApply(
        inheritedSummary as never
      )
    ).toThrow(
      'Attempt handoff finalization request apply requires summary.requestBasis to be "handoff_finalization_target_summary".'
    );

    const inheritedRequests = [createRequest()];
    Object.setPrototypeOf(
      inheritedRequests,
      Object.assign([], {
        1: createRequest({
          attemptId: "att_inherited",
          runtime: "gemini-cli"
        })
      })
    );
    inheritedRequests.length = 2;

    expect(() =>
      validateAttemptHandoffFinalizationRequestSummaryForApply(
        createSummary({
          requests: inheritedRequests as never,
          resultCount: 2,
          invokedResultCount: 2
        })
      )
    ).toThrow(
      "Attempt handoff finalization request apply requires summary.requests entries to be objects."
    );
  });

  it("should fail closed when request entries use accessor-shaped fields", () => {
    const request = createRequest();
    Object.defineProperty(request, "runtime", {
      enumerable: true,
      get() {
        throw new Error("getter boom");
      }
    });

    expect(() =>
      validateAttemptHandoffFinalizationRequestSummaryForApply(
        createSummary({
          requests: [request]
        })
      )
    ).toThrow(ValidationError);
    expect(() =>
      validateAttemptHandoffFinalizationRequestSummaryForApply(
        createSummary({
          requests: [request]
        })
      )
    ).toThrow(
      "Attempt handoff finalization request apply requires summary to be a readable object."
    );
  });

  it("should reject inherited blockingReasons indexes", () => {
    const blockingReasons = ["handoff_unsupported"];
    Object.setPrototypeOf(
      blockingReasons,
      Object.assign([], {
        1: "no_results"
      })
    );
    blockingReasons.length = 2;

    expect(() =>
      validateAttemptHandoffFinalizationRequestSummaryForApply(
        createSummary({
          resultCount: 2,
          invokedResultCount: 0,
          blockedResultCount: 2,
          canFinalizeHandoff: false,
          requests: [],
          blockingReasons: blockingReasons as never
        })
      )
    ).toThrow(
      "Attempt handoff finalization request apply requires summary.blockingReasons to use the existing handoff decision blocker vocabulary."
    );
  });

  it("should reject mixed taskIds after request identity normalization", () => {
    expect(() =>
      validateAttemptHandoffFinalizationRequestSummaryForApply(
        createSummary({
          requests: [
            createRequest({
              taskId: "task_shared"
            }),
            createRequest({
              attemptId: "att_other",
              runtime: "gemini-cli",
              taskId: " task_other "
            })
          ]
        })
      )
    ).toThrow(ValidationError);
    expect(() =>
      validateAttemptHandoffFinalizationRequestSummaryForApply(
        createSummary({
          requests: [
            createRequest({
              taskId: "task_shared"
            }),
            createRequest({
              attemptId: "att_other",
              runtime: "gemini-cli",
              taskId: " task_other "
            })
          ]
        })
      )
    ).toThrow(
      "Attempt handoff finalization request apply requires summary.requests from a single taskId."
    );
  });

  it("should reject duplicate request identities after normalization", () => {
    expect(() =>
      validateAttemptHandoffFinalizationRequestSummaryForApply(
        createSummary({
          requests: [
            createRequest({
              taskId: "task_shared",
              attemptId: "att_dup",
              runtime: "codex-cli"
            }),
            createRequest({
              taskId: " task_shared ",
              attemptId: " att_dup ",
              runtime: " codex-cli "
            })
          ]
        })
      )
    ).toThrow(ValidationError);
    expect(() =>
      validateAttemptHandoffFinalizationRequestSummaryForApply(
        createSummary({
          requests: [
            createRequest({
              taskId: "task_shared",
              attemptId: "att_dup",
              runtime: "codex-cli"
            }),
            createRequest({
              taskId: " task_shared ",
              attemptId: " att_dup ",
              runtime: " codex-cli "
            })
          ]
        })
      )
    ).toThrow(
      "Attempt handoff finalization request apply requires summary.requests to use unique (taskId, attemptId, runtime) identities."
    );
  });
});

function createRequest(
  overrides: Partial<{
    taskId: string;
    attemptId: string;
    runtime: string;
    status: AttemptStatus;
    sourceKind: AttemptSourceKind | undefined;
  }> = {}
): AttemptHandoffFinalizationRequest {
  return {
    taskId: "task_shared",
    attemptId: "att_ready",
    runtime: "codex-cli",
    status: "created",
    sourceKind: undefined,
    ...overrides
  };
}

function createSummary(
  overrides: Partial<{
    requestBasis: AttemptHandoffFinalizationRequestSummary["requestBasis"];
    resultCount: number;
    invokedResultCount: number;
    blockedResultCount: number;
    blockingReasons: AttemptHandoffDecisionBlockingReason[];
    canFinalizeHandoff: boolean;
    requests: AttemptHandoffFinalizationRequest[];
  }> = {}
): AttemptHandoffFinalizationRequestSummary {
  const requests = overrides.requests ?? [createRequest()];

  return {
    requestBasis: attemptHandoffFinalizationRequestBasis,
    resultCount: overrides.resultCount ?? requests.length,
    invokedResultCount: overrides.invokedResultCount ?? requests.length,
    blockedResultCount: overrides.blockedResultCount ?? 0,
    blockingReasons: overrides.blockingReasons ?? [],
    canFinalizeHandoff: overrides.canFinalizeHandoff ?? true,
    requests,
    ...overrides
  };
}
