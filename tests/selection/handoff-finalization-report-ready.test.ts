import { describe, expect, it } from "vitest";

import { ValidationError } from "../../src/core/errors.js";
import * as selection from "../../src/selection/internal.js";
import type {
  AttemptHandoffFinalizationConsumerBlockingReason,
  AttemptHandoffFinalizationExplanationEntry,
  AttemptHandoffFinalizationExplanationSummary
} from "../../src/selection/types.js";

const deriveAttemptHandoffFinalizationReportReady = (
  selection as Partial<{
    deriveAttemptHandoffFinalizationReportReady: (
      input: AttemptHandoffFinalizationExplanationSummary | undefined
    ) =>
      | {
          reportBasis: string;
          results: Array<{
            taskId: string;
            attemptId: string;
            runtime: string;
            status: string;
            sourceKind: string | undefined;
            explanationCode: string;
            invoked: boolean;
            blockingReasons: AttemptHandoffFinalizationConsumerBlockingReason[];
          }>;
          invokedResults: Array<{
            taskId: string;
            attemptId: string;
            runtime: string;
            status: string;
            sourceKind: string | undefined;
            explanationCode: string;
            invoked: boolean;
            blockingReasons: AttemptHandoffFinalizationConsumerBlockingReason[];
          }>;
          blockedResults: Array<{
            taskId: string;
            attemptId: string;
            runtime: string;
            status: string;
            sourceKind: string | undefined;
            explanationCode: string;
            invoked: boolean;
            blockingReasons: AttemptHandoffFinalizationConsumerBlockingReason[];
          }>;
        }
      | undefined;
  }>
).deriveAttemptHandoffFinalizationReportReady as (
  input: AttemptHandoffFinalizationExplanationSummary | undefined
) =>
  | {
      reportBasis: string;
      results: Array<{
        taskId: string;
        attemptId: string;
        runtime: string;
        status: string;
        sourceKind: string | undefined;
        explanationCode: string;
        invoked: boolean;
        blockingReasons: AttemptHandoffFinalizationConsumerBlockingReason[];
      }>;
      invokedResults: Array<{
        taskId: string;
        attemptId: string;
        runtime: string;
        status: string;
        sourceKind: string | undefined;
        explanationCode: string;
        invoked: boolean;
        blockingReasons: AttemptHandoffFinalizationConsumerBlockingReason[];
      }>;
      blockedResults: Array<{
        taskId: string;
        attemptId: string;
        runtime: string;
        status: string;
        sourceKind: string | undefined;
        explanationCode: string;
        invoked: boolean;
        blockingReasons: AttemptHandoffFinalizationConsumerBlockingReason[];
      }>;
    }
  | undefined;

describe("selection handoff-finalization-report-ready helpers", () => {
  it("should return undefined when the supplied finalization explanation summary is undefined", () => {
    expect(deriveAttemptHandoffFinalizationReportReady(undefined)).toBeUndefined();
  });

  it("should derive an empty report-ready projection for an empty explanation summary", () => {
    expect(
      deriveAttemptHandoffFinalizationReportReady({
        explanationBasis: "handoff_finalization_outcome_summary",
        results: [],
        invokedResults: [],
        blockedResults: []
      })
    ).toEqual({
      reportBasis: "handoff_finalization_explanation_summary",
      results: [],
      invokedResults: [],
      blockedResults: []
    });
  });

  it("should fail loudly when the supplied summary is not an object", () => {
    expect(() =>
      deriveAttemptHandoffFinalizationReportReady(null as never)
    ).toThrow(ValidationError);
    expect(() =>
      deriveAttemptHandoffFinalizationReportReady(null as never)
    ).toThrow(
      "Attempt handoff finalization report-ready requires summary to be an object."
    );
  });

  it("should fail loudly when the supplied explanation basis drifts from the current finalization explanation layer", () => {
    expect(() =>
      deriveAttemptHandoffFinalizationReportReady({
        ...createExplanationSummary([]),
        explanationBasis: "handoff_finalization_apply_batch"
      } as never)
    ).toThrow(ValidationError);
    expect(() =>
      deriveAttemptHandoffFinalizationReportReady({
        ...createExplanationSummary([]),
        explanationBasis: "handoff_finalization_apply_batch"
      } as never)
    ).toThrow(
      'Attempt handoff finalization report-ready requires summary.explanationBasis to be "handoff_finalization_outcome_summary".'
    );
  });

  it("should fail loudly when the supplied explanation results are not an array", () => {
    expect(() =>
      deriveAttemptHandoffFinalizationReportReady({
        explanationBasis: "handoff_finalization_outcome_summary",
        results: null,
        invokedResults: [],
        blockedResults: []
      } as never)
    ).toThrow(ValidationError);
    expect(() =>
      deriveAttemptHandoffFinalizationReportReady({
        explanationBasis: "handoff_finalization_outcome_summary",
        results: null,
        invokedResults: [],
        blockedResults: []
      } as never)
    ).toThrow(
      "Attempt handoff finalization report-ready requires summary.results to be an array."
    );
  });

  it("should flatten explanation entries into a stable grouped report-ready projection", () => {
    expect(
      deriveAttemptHandoffFinalizationReportReady(
        createExplanationSummary([
          createBlockedExplanationEntry({
            outcome: {
              taskId: "  task_shared  ",
              attemptId: "  att_blocked  ",
              runtime: "  blocked-cli  ",
              status: "created",
              sourceKind: "delegated",
              invoked: false,
              blockingReasons: ["handoff_finalization_unsupported"]
            }
          }),
          createInvokedExplanationEntry({
            outcome: {
              taskId: "  task_shared  ",
              attemptId: "  att_invoked  ",
              runtime: "  codex-cli  ",
              status: "running",
              sourceKind: undefined,
              invoked: true,
              blockingReasons: []
            }
          })
        ])
      )
    ).toEqual({
      reportBasis: "handoff_finalization_explanation_summary",
      results: [
        createBlockedReportEntry({
          taskId: "task_shared",
          attemptId: "att_blocked",
          runtime: "blocked-cli",
          sourceKind: "delegated"
        }),
        createInvokedReportEntry()
      ],
      invokedResults: [createInvokedReportEntry()],
      blockedResults: [
        createBlockedReportEntry({
          taskId: "task_shared",
          attemptId: "att_blocked",
          runtime: "blocked-cli",
          sourceKind: "delegated"
        })
      ]
    });
  });

  it("should fail loudly when explanation subgroups drift from the canonical filtered groups", () => {
    expect(() =>
      deriveAttemptHandoffFinalizationReportReady({
        ...createExplanationSummary([createInvokedExplanationEntry()]),
        invokedResults: []
      })
    ).toThrow(ValidationError);
    expect(() =>
      deriveAttemptHandoffFinalizationReportReady({
        ...createExplanationSummary([createInvokedExplanationEntry()]),
        invokedResults: []
      })
    ).toThrow(
      "Attempt handoff finalization report-ready requires summary.invokedResults to match the stable filtered invoked subgroup."
    );
  });

  it("should fail loudly when explanation entries violate the current code/blocker contract", () => {
    expect(() =>
      deriveAttemptHandoffFinalizationReportReady(
        createExplanationSummary([
          createBlockedExplanationEntry({
            blockingReasons: [],
            outcome: {
              taskId: "task_shared",
              attemptId: "att_blocked",
              runtime: "blocked-cli",
              status: "created",
              sourceKind: undefined,
              invoked: false,
              blockingReasons: []
            }
          })
        ])
      )
    ).toThrow(ValidationError);
    expect(() =>
      deriveAttemptHandoffFinalizationReportReady(
        createExplanationSummary([
          createBlockedExplanationEntry({
            blockingReasons: [],
            outcome: {
              taskId: "task_shared",
              attemptId: "att_blocked",
              runtime: "blocked-cli",
              status: "created",
              sourceKind: undefined,
              invoked: false,
              blockingReasons: []
            }
          })
        ])
      )
    ).toThrow(
      "Attempt handoff finalization report-ready requires blocked entries to keep blockingReasons."
    );
  });

  it("should keep the flattened report-ready shape minimal without leaking nested explanation payloads", () => {
    const report = deriveAttemptHandoffFinalizationReportReady(
      createExplanationSummary([createInvokedExplanationEntry()])
    ) as Record<string, unknown>;

    expect(Object.keys(report).sort()).toEqual(
      ["blockedResults", "invokedResults", "reportBasis", "results"].sort()
    );
    expect(
      Object.keys((report.results as Array<Record<string, unknown>>)[0]!).sort()
    ).toEqual(
      [
        "attemptId",
        "blockingReasons",
        "explanationCode",
        "invoked",
        "runtime",
        "sourceKind",
        "status",
        "taskId"
      ].sort()
    );
  });
});

function createExplanationSummary(
  results: AttemptHandoffFinalizationExplanationEntry[]
): AttemptHandoffFinalizationExplanationSummary {
  return {
    explanationBasis: "handoff_finalization_outcome_summary",
    results,
    invokedResults: results.filter((entry) => entry.invoked),
    blockedResults: results.filter((entry) => !entry.invoked)
  };
}

function createInvokedExplanationEntry(
  overrides: Partial<AttemptHandoffFinalizationExplanationEntry> = {}
): AttemptHandoffFinalizationExplanationEntry {
  return {
    outcome: {
      taskId: "task_shared",
      attemptId: "att_invoked",
      runtime: "codex-cli",
      status: "running",
      sourceKind: undefined,
      invoked: true,
      blockingReasons: [],
      ...(overrides.outcome ?? {})
    },
    explanationCode: "handoff_finalization_invoked",
    invoked: true,
    blockingReasons: [],
    ...overrides
  };
}

function createBlockedExplanationEntry(
  overrides: Partial<AttemptHandoffFinalizationExplanationEntry> = {}
): AttemptHandoffFinalizationExplanationEntry {
  return {
    outcome: {
      taskId: "task_shared",
      attemptId: "att_blocked",
      runtime: "blocked-cli",
      status: "created",
      sourceKind: undefined,
      invoked: false,
      blockingReasons: ["handoff_finalization_unsupported"],
      ...(overrides.outcome ?? {})
    },
    explanationCode: "handoff_finalization_blocked_unsupported",
    invoked: false,
    blockingReasons: ["handoff_finalization_unsupported"],
    ...overrides
  };
}

function createInvokedReportEntry(
  overrides: Partial<{
    taskId: string;
    attemptId: string;
    runtime: string;
    status: string;
    sourceKind: string | undefined;
    explanationCode: string;
    invoked: boolean;
    blockingReasons: AttemptHandoffFinalizationConsumerBlockingReason[];
  }> = {}
) {
  return {
    taskId: "task_shared",
    attemptId: "att_invoked",
    runtime: "codex-cli",
    status: "running",
    sourceKind: undefined,
    explanationCode: "handoff_finalization_invoked",
    invoked: true,
    blockingReasons: [],
    ...overrides
  };
}

function createBlockedReportEntry(
  overrides: Partial<{
    taskId: string;
    attemptId: string;
    runtime: string;
    status: string;
    sourceKind: string | undefined;
    explanationCode: string;
    invoked: boolean;
    blockingReasons: AttemptHandoffFinalizationConsumerBlockingReason[];
  }> = {}
) {
  return {
    taskId: "task_shared",
    attemptId: "att_blocked",
    runtime: "blocked-cli",
    status: "created",
    sourceKind: undefined,
    explanationCode: "handoff_finalization_blocked_unsupported",
    invoked: false,
    blockingReasons: ["handoff_finalization_unsupported"],
    ...overrides
  };
}
