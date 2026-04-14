import { describe, expect, it } from "vitest";

import { ValidationError } from "../../src/core/errors.js";
import * as selection from "../../src/selection/internal.js";
import type {
  AttemptHandoffFinalizationConsumerBlockingReason,
  AttemptHandoffFinalizationOutcome,
  AttemptHandoffFinalizationOutcomeSummary
} from "../../src/selection/types.js";

const deriveAttemptHandoffFinalizationExplanationSummary = (
  selection as Partial<{
    deriveAttemptHandoffFinalizationExplanationSummary: (
      input: AttemptHandoffFinalizationOutcomeSummary | undefined
    ) =>
      | {
          explanationBasis: string;
          results: Array<{
            outcome: AttemptHandoffFinalizationOutcome;
            explanationCode: string;
            invoked: boolean;
            blockingReasons: AttemptHandoffFinalizationConsumerBlockingReason[];
          }>;
          invokedResults: Array<{
            outcome: AttemptHandoffFinalizationOutcome;
            explanationCode: string;
            invoked: boolean;
            blockingReasons: AttemptHandoffFinalizationConsumerBlockingReason[];
          }>;
          blockedResults: Array<{
            outcome: AttemptHandoffFinalizationOutcome;
            explanationCode: string;
            invoked: boolean;
            blockingReasons: AttemptHandoffFinalizationConsumerBlockingReason[];
          }>;
        }
      | undefined;
  }>
).deriveAttemptHandoffFinalizationExplanationSummary as (
  input: AttemptHandoffFinalizationOutcomeSummary | undefined
) =>
  | {
      explanationBasis: string;
      results: Array<{
        outcome: AttemptHandoffFinalizationOutcome;
        explanationCode: string;
        invoked: boolean;
        blockingReasons: AttemptHandoffFinalizationConsumerBlockingReason[];
      }>;
      invokedResults: Array<{
        outcome: AttemptHandoffFinalizationOutcome;
        explanationCode: string;
        invoked: boolean;
        blockingReasons: AttemptHandoffFinalizationConsumerBlockingReason[];
      }>;
      blockedResults: Array<{
        outcome: AttemptHandoffFinalizationOutcome;
        explanationCode: string;
        invoked: boolean;
        blockingReasons: AttemptHandoffFinalizationConsumerBlockingReason[];
      }>;
    }
  | undefined;

describe("selection handoff-finalization-explanation helpers", () => {
  it("should return undefined when the supplied finalization outcome summary is undefined", () => {
    expect(
      deriveAttemptHandoffFinalizationExplanationSummary(undefined)
    ).toBeUndefined();
  });

  it("should fail loudly when the supplied finalization outcome summary is null", () => {
    expect(() =>
      deriveAttemptHandoffFinalizationExplanationSummary(null as never)
    ).toThrow(ValidationError);
    expect(() =>
      deriveAttemptHandoffFinalizationExplanationSummary(null as never)
    ).toThrow(
      "Attempt handoff finalization explanation summary requires summary to be an object."
    );
  });

  it("should fail loudly when summary.outcomes is not an array", () => {
    expect(() =>
      deriveAttemptHandoffFinalizationExplanationSummary({
        outcomeBasis: "handoff_finalization_apply_batch",
        resultCount: 0,
        invokedResultCount: 0,
        blockedResultCount: 0,
        blockingReasons: [],
        outcomes: null
      } as never)
    ).toThrow(ValidationError);
    expect(() =>
      deriveAttemptHandoffFinalizationExplanationSummary({
        outcomeBasis: "handoff_finalization_apply_batch",
        resultCount: 0,
        invokedResultCount: 0,
        blockedResultCount: 0,
        blockingReasons: [],
        outcomes: null
      } as never)
    ).toThrow(
      "Attempt handoff finalization explanation summary requires summary.outcomes to be an array."
    );
  });

  it("should derive a zero-count explanation summary for an empty outcome summary", () => {
    expect(
      deriveAttemptHandoffFinalizationExplanationSummary({
        outcomeBasis: "handoff_finalization_apply_batch",
        resultCount: 0,
        invokedResultCount: 0,
        blockedResultCount: 0,
        blockingReasons: [],
        outcomes: []
      })
    ).toEqual({
      explanationBasis: "handoff_finalization_outcome_summary",
      results: [],
      invokedResults: [],
      blockedResults: []
    });
  });

  it("should preserve order and derive stable invoked and blocked explanation subgroups", () => {
    const summary = createOutcomeSummary([
      createBlockedOutcome({
        attemptId: "att_blocked_1",
        runtime: "blocked-cli"
      }),
      createInvokedOutcome({
        attemptId: "att_invoked_1"
      }),
      createBlockedOutcome({
        attemptId: "att_blocked_2",
        runtime: "blocked-cli",
        sourceKind: "delegated"
      })
    ]);

    expect(
      deriveAttemptHandoffFinalizationExplanationSummary(summary)
    ).toEqual({
      explanationBasis: "handoff_finalization_outcome_summary",
      results: [
        createBlockedExplanationEntry({
          attemptId: "att_blocked_1",
          runtime: "blocked-cli"
        }),
        createInvokedExplanationEntry({
          attemptId: "att_invoked_1"
        }),
        createBlockedExplanationEntry({
          attemptId: "att_blocked_2",
          runtime: "blocked-cli",
          sourceKind: "delegated"
        })
      ],
      invokedResults: [
        createInvokedExplanationEntry({
          attemptId: "att_invoked_1"
        })
      ],
      blockedResults: [
        createBlockedExplanationEntry({
          attemptId: "att_blocked_1",
          runtime: "blocked-cli"
        }),
        createBlockedExplanationEntry({
          attemptId: "att_blocked_2",
          runtime: "blocked-cli",
          sourceKind: "delegated"
        })
      ]
    });
  });

  it("should fail loudly when summary.outcomes mixes taskIds after canonicalization", () => {
    expect(() =>
      deriveAttemptHandoffFinalizationExplanationSummary(
        createOutcomeSummary([
          createInvokedOutcome({
            taskId: "task_shared",
            attemptId: "att_invoked"
          }),
          createBlockedOutcome({
            taskId: " task_other ",
            attemptId: "att_blocked"
          })
        ])
      )
    ).toThrow(ValidationError);
    expect(() =>
      deriveAttemptHandoffFinalizationExplanationSummary(
        createOutcomeSummary([
          createInvokedOutcome({
            taskId: "task_shared",
            attemptId: "att_invoked"
          }),
          createBlockedOutcome({
            taskId: " task_other ",
            attemptId: "att_blocked"
          })
        ])
      )
    ).toThrow(
      "Attempt handoff finalization explanation summary requires summary.outcomes from a single taskId."
    );
  });

  it("should fail loudly when summary.outcomes reuses duplicate identities after canonicalization", () => {
    expect(() =>
      deriveAttemptHandoffFinalizationExplanationSummary(
        createOutcomeSummary([
          createInvokedOutcome({
            taskId: "task_shared",
            attemptId: "att_dup",
            runtime: "codex-cli"
          }),
          createBlockedOutcome({
            taskId: " task_shared ",
            attemptId: " att_dup ",
            runtime: " codex-cli "
          })
        ])
      )
    ).toThrow(ValidationError);
    expect(() =>
      deriveAttemptHandoffFinalizationExplanationSummary(
        createOutcomeSummary([
          createInvokedOutcome({
            taskId: "task_shared",
            attemptId: "att_dup",
            runtime: "codex-cli"
          }),
          createBlockedOutcome({
            taskId: " task_shared ",
            attemptId: " att_dup ",
            runtime: " codex-cli "
          })
        ])
      )
    ).toThrow(
      "Attempt handoff finalization explanation summary requires summary.outcomes to use unique (taskId, attemptId, runtime) identities."
    );
  });

  it("should fail closed when reading outcome identity fields throws through an accessor-shaped input", () => {
    const outcome = createBlockedOutcome();
    Object.defineProperty(outcome, "taskId", {
      configurable: true,
      enumerable: true,
      get() {
        throw new Error("getter boom");
      }
    });

    expect(() =>
      deriveAttemptHandoffFinalizationExplanationSummary(
        createOutcomeSummary([outcome])
      )
    ).toThrow(ValidationError);
    expect(() =>
      deriveAttemptHandoffFinalizationExplanationSummary(
        createOutcomeSummary([outcome])
      )
    ).toThrow(
      "Attempt handoff finalization explanation summary requires outcome.taskId to be a non-empty string."
    );
  });

  it("should reject outcomes that only provide required identity fields through the prototype chain", () => {
    const outcome = Object.create(createBlockedOutcome(), {
      invoked: {
        configurable: true,
        enumerable: true,
        value: false
      },
      blockingReasons: {
        configurable: true,
        enumerable: true,
        value: ["handoff_finalization_unsupported"]
      },
      status: {
        configurable: true,
        enumerable: true,
        value: "created"
      },
      sourceKind: {
        configurable: true,
        enumerable: true,
        value: undefined
      }
    });

    expect(() =>
      deriveAttemptHandoffFinalizationExplanationSummary(
        createOutcomeSummary([outcome as never])
      )
    ).toThrow(ValidationError);
    expect(() =>
      deriveAttemptHandoffFinalizationExplanationSummary(
        createOutcomeSummary([outcome as never])
      )
    ).toThrow(
      "Attempt handoff finalization explanation summary requires outcome.taskId to be a non-empty string."
    );
  });

  it("should fail loudly when outcome counts drift from the canonical outcome array", () => {
    expect(() =>
      deriveAttemptHandoffFinalizationExplanationSummary({
        ...createOutcomeSummary([createInvokedOutcome()]),
        resultCount: 2
      })
    ).toThrow(ValidationError);
    expect(() =>
      deriveAttemptHandoffFinalizationExplanationSummary({
        ...createOutcomeSummary([createInvokedOutcome()]),
        resultCount: 2
      })
    ).toThrow(
      "Attempt handoff finalization explanation summary requires summary.resultCount to match summary.outcomes.length."
    );
  });

  it("should fail loudly when summary blocking reasons drift from the outcome union", () => {
    expect(() =>
      deriveAttemptHandoffFinalizationExplanationSummary({
        ...createOutcomeSummary([createBlockedOutcome()]),
        blockingReasons: []
      })
    ).toThrow(ValidationError);
    expect(() =>
      deriveAttemptHandoffFinalizationExplanationSummary({
        ...createOutcomeSummary([createBlockedOutcome()]),
        blockingReasons: []
      })
    ).toThrow(
      "Attempt handoff finalization explanation summary requires summary.blockingReasons to match the stable blocking-reason union derived from summary.outcomes."
    );
  });

  it("should fail loudly when blocked outcomes lose their blocker vocabulary", () => {
    expect(() =>
      deriveAttemptHandoffFinalizationExplanationSummary(
        createOutcomeSummary([
          createInvokedOutcome(),
          {
            ...createBlockedOutcome(),
            blockingReasons: []
          }
        ])
      )
    ).toThrow(ValidationError);
    expect(() =>
      deriveAttemptHandoffFinalizationExplanationSummary(
        createOutcomeSummary([
          createInvokedOutcome(),
          {
            ...createBlockedOutcome(),
            blockingReasons: []
          }
        ])
      )
    ).toThrow(
      "Attempt handoff finalization explanation summary requires blocked outcomes to keep blockingReasons."
    );
  });

  it("should fail loudly when invoked outcomes leak blocker vocabulary", () => {
    expect(() =>
      deriveAttemptHandoffFinalizationExplanationSummary(
        createOutcomeSummary([
          {
            ...createInvokedOutcome(),
            blockingReasons: ["handoff_finalization_unsupported"]
          }
        ])
      )
    ).toThrow(ValidationError);
    expect(() =>
      deriveAttemptHandoffFinalizationExplanationSummary(
        createOutcomeSummary([
          {
            ...createInvokedOutcome(),
            blockingReasons: ["handoff_finalization_unsupported"]
          }
        ])
      )
    ).toThrow(
      "Attempt handoff finalization explanation summary requires invoked outcomes to use empty blockingReasons."
    );
  });

  it("should fail loudly when summary.blockingReasons contains sparse array holes", () => {
    const sparseBlockingReasons =
      new Array<AttemptHandoffFinalizationConsumerBlockingReason>(1);

    expect(() =>
      deriveAttemptHandoffFinalizationExplanationSummary({
        ...createOutcomeSummary([createBlockedOutcome()]),
        blockingReasons: sparseBlockingReasons
      })
    ).toThrow(ValidationError);
    expect(() =>
      deriveAttemptHandoffFinalizationExplanationSummary({
        ...createOutcomeSummary([createBlockedOutcome()]),
        blockingReasons: sparseBlockingReasons
      })
    ).toThrow(
      "Attempt handoff finalization explanation summary requires summary.blockingReasons to use the existing handoff-finalization blocker vocabulary."
    );
  });

  it("should fail loudly when blocked outcomes rely on inherited blockingReasons indexes", () => {
    const inheritedBlockingReasons = createInheritedIndexBlockingReasonArray(
      0,
      "handoff_finalization_unsupported"
    );

    expect(() =>
      deriveAttemptHandoffFinalizationExplanationSummary(
        createOutcomeSummary([
          createBlockedOutcome({
            blockingReasons: inheritedBlockingReasons
          })
        ])
      )
    ).toThrow(ValidationError);
    expect(() =>
      deriveAttemptHandoffFinalizationExplanationSummary(
        createOutcomeSummary([
          createBlockedOutcome({
            blockingReasons: inheritedBlockingReasons
          })
        ])
      )
    ).toThrow(
      "Attempt handoff finalization explanation summary requires outcome.blockingReasons to use the existing handoff-finalization blocker vocabulary."
    );
  });

  it("should fail loudly when summary.outcomes contains sparse array holes", () => {
    const outcomes = new Array<AttemptHandoffFinalizationOutcome>(1);

    expect(() =>
      deriveAttemptHandoffFinalizationExplanationSummary({
        outcomeBasis: "handoff_finalization_apply_batch",
        resultCount: 1,
        invokedResultCount: 0,
        blockedResultCount: 1,
        blockingReasons: ["handoff_finalization_unsupported"],
        outcomes
      })
    ).toThrow(ValidationError);
    expect(() =>
      deriveAttemptHandoffFinalizationExplanationSummary({
        outcomeBasis: "handoff_finalization_apply_batch",
        resultCount: 1,
        invokedResultCount: 0,
        blockedResultCount: 1,
        blockingReasons: ["handoff_finalization_unsupported"],
        outcomes
      })
    ).toThrow(
      "Attempt handoff finalization explanation summary requires summary.outcomes[0] to be an object."
    );
  });

  it("should fail loudly when summary.outcomes relies on inherited array indexes", () => {
    const inheritedOutcome = createBlockedOutcome({
      attemptId: "att_inherited"
    });

    const outcomes = createInheritedIndexOutcomeArray(0, inheritedOutcome);

    expect(() =>
      deriveAttemptHandoffFinalizationExplanationSummary({
        outcomeBasis: "handoff_finalization_apply_batch",
        resultCount: 1,
        invokedResultCount: 0,
        blockedResultCount: 1,
        blockingReasons: ["handoff_finalization_unsupported"],
        outcomes
      })
    ).toThrow(ValidationError);
    expect(() =>
      deriveAttemptHandoffFinalizationExplanationSummary({
        outcomeBasis: "handoff_finalization_apply_batch",
        resultCount: 1,
        invokedResultCount: 0,
        blockedResultCount: 1,
        blockingReasons: ["handoff_finalization_unsupported"],
        outcomes
      })
    ).toThrow(
      "Attempt handoff finalization explanation summary requires summary.outcomes[0] to be an object."
    );
  });

  it("should emit canonical trimmed outcome fields after validation", () => {
    expect(
      deriveAttemptHandoffFinalizationExplanationSummary(
        createOutcomeSummary([
          createInvokedOutcome({
            taskId: "  task_shared  ",
            attemptId: "  att_invoked  ",
            runtime: "  codex-cli  "
          }),
          createBlockedOutcome({
            taskId: "  task_shared  ",
            attemptId: "  att_blocked  ",
            runtime: "  blocked-cli  "
          })
        ])
      )
    ).toEqual({
      explanationBasis: "handoff_finalization_outcome_summary",
      results: [
        createInvokedExplanationEntry(),
        createBlockedExplanationEntry()
      ],
      invokedResults: [createInvokedExplanationEntry()],
      blockedResults: [createBlockedExplanationEntry()]
    });
  });

  it("should return fresh subgroup arrays without mutating the supplied summary", () => {
    const summary = createOutcomeSummary([
      createInvokedOutcome(),
      createBlockedOutcome()
    ]);

    const explanation =
      deriveAttemptHandoffFinalizationExplanationSummary(summary);

    expect(explanation).toBeDefined();
    expect(explanation?.results).not.toBe(summary.outcomes);
    expect(explanation?.invokedResults).not.toBe(summary.outcomes);
    expect(explanation?.blockedResults).not.toBe(summary.outcomes);
    expect(explanation?.results[0]?.outcome).not.toBe(summary.outcomes[0]);
    expect(summary).toEqual(
      createOutcomeSummary([createInvokedOutcome(), createBlockedOutcome()])
    );
  });
});

function createOutcomeSummary(
  outcomes: AttemptHandoffFinalizationOutcome[]
): AttemptHandoffFinalizationOutcomeSummary {
  const invokedResultCount = outcomes.filter((outcome) => outcome.invoked).length;
  const blockedResultCount = outcomes.length - invokedResultCount;
  const blockingReasons = [
    ...new Set(outcomes.flatMap((outcome) => outcome.blockingReasons))
  ];

  return {
    outcomeBasis: "handoff_finalization_apply_batch",
    resultCount: outcomes.length,
    invokedResultCount,
    blockedResultCount,
    blockingReasons,
    outcomes
  };
}

function createInvokedOutcome(
  overrides: Partial<AttemptHandoffFinalizationOutcome> = {}
): AttemptHandoffFinalizationOutcome {
  return {
    taskId: overrides.taskId ?? "task_shared",
    attemptId: overrides.attemptId ?? "att_invoked",
    runtime: overrides.runtime ?? "codex-cli",
    status: overrides.status ?? "running",
    sourceKind: overrides.sourceKind,
    invoked: true,
    blockingReasons: overrides.blockingReasons ?? []
  };
}

function createBlockedOutcome(
  overrides: Partial<AttemptHandoffFinalizationOutcome> = {}
): AttemptHandoffFinalizationOutcome {
  return {
    taskId: overrides.taskId ?? "task_shared",
    attemptId: overrides.attemptId ?? "att_blocked",
    runtime: overrides.runtime ?? "blocked-cli",
    status: overrides.status ?? "created",
    sourceKind: overrides.sourceKind,
    invoked: false,
    blockingReasons:
      overrides.blockingReasons ?? ["handoff_finalization_unsupported"]
  };
}

function createInvokedExplanationEntry(
  overrides: Partial<AttemptHandoffFinalizationOutcome> = {}
) {
  const outcome = createInvokedOutcome(overrides);

  return {
    outcome,
    explanationCode: "handoff_finalization_invoked",
    invoked: true,
    blockingReasons: []
  };
}

function createBlockedExplanationEntry(
  overrides: Partial<AttemptHandoffFinalizationOutcome> = {}
) {
  const outcome = createBlockedOutcome(overrides);

  return {
    outcome,
    explanationCode: "handoff_finalization_blocked_unsupported",
    invoked: false,
    blockingReasons: ["handoff_finalization_unsupported"]
  };
}

function createInheritedIndexOutcomeArray(
  index: number,
  outcome: AttemptHandoffFinalizationOutcome
): AttemptHandoffFinalizationOutcome[] {
  const outcomes = new Array<AttemptHandoffFinalizationOutcome>(index + 1);
  const inheritedIndexPrototype = Object.create(Array.prototype, {
    [index]: {
      value: outcome,
      configurable: true
    }
  });

  Object.setPrototypeOf(outcomes, inheritedIndexPrototype);

  return outcomes;
}

function createInheritedIndexBlockingReasonArray(
  index: number,
  reason: AttemptHandoffFinalizationConsumerBlockingReason
): AttemptHandoffFinalizationConsumerBlockingReason[] {
  const blockingReasons =
    new Array<AttemptHandoffFinalizationConsumerBlockingReason>(index + 1);
  const inheritedIndexPrototype = Object.create(Array.prototype, {
    [index]: {
      value: reason,
      configurable: true
    }
  });

  Object.setPrototypeOf(blockingReasons, inheritedIndexPrototype);

  return blockingReasons;
}
