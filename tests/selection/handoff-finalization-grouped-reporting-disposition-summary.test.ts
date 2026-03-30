import { describe, expect, it } from "vitest";

import { ValidationError } from "../../src/core/errors.js";
import * as selection from "../../src/selection/internal.js";
import type {
  AttemptHandoffFinalizationExplanationCode,
  AttemptHandoffFinalizationGroupedReportingGroup,
  AttemptHandoffFinalizationGroupedReportingSummary
} from "../../src/selection/types.js";

type GroupedReportingDispositionShape = {
  groupedReportingDispositionBasis: string;
  resultCount: number;
  invokedResultCount: number;
  blockedResultCount: number;
  groupCount: number;
  reportingDisposition: "empty" | "all_invoked" | "all_blocked" | "mixed";
};

const deriveAttemptHandoffFinalizationGroupedReportingDispositionSummary = (
  selection as Partial<{
    deriveAttemptHandoffFinalizationGroupedReportingDispositionSummary: (
      input: AttemptHandoffFinalizationGroupedReportingSummary | undefined
    ) => GroupedReportingDispositionShape | undefined;
  }>
).deriveAttemptHandoffFinalizationGroupedReportingDispositionSummary as (
  input: AttemptHandoffFinalizationGroupedReportingSummary | undefined
) => GroupedReportingDispositionShape | undefined;

describe(
  "selection handoff-finalization-grouped-reporting-disposition-summary helpers",
  () => {
    it("should return undefined when the supplied grouped reporting summary is undefined", () => {
      expect(
        deriveAttemptHandoffFinalizationGroupedReportingDispositionSummary(
          undefined
        )
      ).toBeUndefined();
    });

    it("should derive an empty disposition when no grouped reporting results exist", () => {
      expect(
        deriveAttemptHandoffFinalizationGroupedReportingDispositionSummary(
          createGroupedReportingSummary([])
        )
      ).toEqual({
        groupedReportingDispositionBasis:
          "handoff_finalization_grouped_reporting_summary",
        resultCount: 0,
        invokedResultCount: 0,
        blockedResultCount: 0,
        groupCount: 0,
        reportingDisposition: "empty"
      });
    });

    it("should derive an all-invoked disposition from an invoked-only grouped reporting summary", () => {
      expect(
        deriveAttemptHandoffFinalizationGroupedReportingDispositionSummary(
          createGroupedReportingSummary([createInvokedReportingGroup()])
        )
      ).toEqual({
        groupedReportingDispositionBasis:
          "handoff_finalization_grouped_reporting_summary",
        resultCount: 3,
        invokedResultCount: 3,
        blockedResultCount: 0,
        groupCount: 1,
        reportingDisposition: "all_invoked"
      });
    });

    it("should derive an all-blocked disposition from a blocked-only grouped reporting summary", () => {
      expect(
        deriveAttemptHandoffFinalizationGroupedReportingDispositionSummary(
          createGroupedReportingSummary([createBlockedReportingGroup()])
        )
      ).toEqual({
        groupedReportingDispositionBasis:
          "handoff_finalization_grouped_reporting_summary",
        resultCount: 2,
        invokedResultCount: 0,
        blockedResultCount: 2,
        groupCount: 1,
        reportingDisposition: "all_blocked"
      });
    });

    it("should derive a mixed disposition from a grouped reporting summary that spans invoked and blocked groups", () => {
      expect(
        deriveAttemptHandoffFinalizationGroupedReportingDispositionSummary(
          createGroupedReportingSummary([
            createBlockedReportingGroup(),
            createInvokedReportingGroup()
          ])
        )
      ).toEqual({
        groupedReportingDispositionBasis:
          "handoff_finalization_grouped_reporting_summary",
        resultCount: 5,
        invokedResultCount: 3,
        blockedResultCount: 2,
        groupCount: 2,
        reportingDisposition: "mixed"
      });
    });

    it("should fail loudly when the supplied grouped reporting basis drifts from the current layer", () => {
      const act = () =>
        deriveAttemptHandoffFinalizationGroupedReportingDispositionSummary({
          ...createGroupedReportingSummary([]),
          groupedReportingBasis: "handoff_finalization_report_ready"
        } as never);

      expect(act).toThrow(ValidationError);
      expect(act).toThrow(
        'Attempt handoff finalization grouped reporting disposition summary requires summary.groupedReportingBasis to be "handoff_finalization_grouped_projection_summary".'
      );
    });

    it("should fail loudly when grouped reporting groups are not an array", () => {
      const act = () =>
        deriveAttemptHandoffFinalizationGroupedReportingDispositionSummary({
          groupedReportingBasis: "handoff_finalization_grouped_projection_summary",
          resultCount: 0,
          invokedResultCount: 0,
          blockedResultCount: 0,
          groups: null
        } as never);

      expect(act).toThrow(ValidationError);
      expect(act).toThrow(
        "Attempt handoff finalization grouped reporting disposition summary requires summary.groups to be an array."
      );
    });

    it("should fail loudly when top-level grouped reporting counts are not non-negative integers", () => {
      const act = () =>
        deriveAttemptHandoffFinalizationGroupedReportingDispositionSummary({
          ...createGroupedReportingSummary([]),
          resultCount: 0.5
        });

      expect(act).toThrow(ValidationError);
      expect(act).toThrow(
        "Attempt handoff finalization grouped reporting disposition summary requires summary.resultCount to be a non-negative integer."
      );
    });

    it("should fail loudly when top-level grouped reporting counts drift from the canonical group sums", () => {
      const act = () =>
        deriveAttemptHandoffFinalizationGroupedReportingDispositionSummary({
          ...createGroupedReportingSummary([createInvokedReportingGroup()]),
          resultCount: 4,
          invokedResultCount: 3,
          blockedResultCount: 1
        });

      expect(act).toThrow(ValidationError);
      expect(act).toThrow(
        "Attempt handoff finalization grouped reporting disposition summary requires summary.resultCount to match the canonical total derived from summary.groups."
      );
    });

    it("should fail loudly when top-level grouped reporting count splits stop adding up", () => {
      const act = () =>
        deriveAttemptHandoffFinalizationGroupedReportingDispositionSummary({
          ...createGroupedReportingSummary([createBlockedReportingGroup()]),
          resultCount: 3,
          blockedResultCount: 1
        });

      expect(act).toThrow(ValidationError);
      expect(act).toThrow(
        "Attempt handoff finalization grouped reporting disposition summary requires summary count split to add up to summary.resultCount."
      );
    });

    it("should fail loudly when grouped reporting input contains duplicate explanation-code groups", () => {
      const act = () =>
        deriveAttemptHandoffFinalizationGroupedReportingDispositionSummary(
          createGroupedReportingSummary([
            createBlockedReportingGroup(),
            createBlockedReportingGroup({ resultCount: 1, blockedResultCount: 1 })
          ])
        );

      expect(act).toThrow(ValidationError);
      expect(act).toThrow(
        "Attempt handoff finalization grouped reporting disposition summary requires summary.groups to keep a single canonical group per explanation code."
      );
    });

    it("should fail loudly when grouped reporting groups rely on inherited array indexes", () => {
      Array.prototype[0] = createBlockedReportingGroup();

      try {
        const sparseGroups =
          new Array<AttemptHandoffFinalizationGroupedReportingGroup>(1);
        const act = () =>
          deriveAttemptHandoffFinalizationGroupedReportingDispositionSummary({
            groupedReportingBasis: "handoff_finalization_grouped_projection_summary",
            resultCount: 0,
            invokedResultCount: 0,
            blockedResultCount: 0,
            groups: sparseGroups
          });

        expect(act).toThrow(ValidationError);
        expect(act).toThrow(
          "Attempt handoff finalization grouped reporting disposition summary requires summary.groups entries to be objects."
        );
      } finally {
        delete Array.prototype[0];
      }
    });

    it("should fail loudly when a grouped reporting group count split stops adding up to the group total", () => {
      const act = () =>
        deriveAttemptHandoffFinalizationGroupedReportingDispositionSummary(
          {
            groupedReportingBasis:
              "handoff_finalization_grouped_projection_summary",
            resultCount: 5,
            invokedResultCount: 2,
            blockedResultCount: 3,
            groups: [
              createInvokedReportingGroup({
                resultCount: 5,
                invokedResultCount: 2,
                blockedResultCount: 2
              })
            ]
          }
        );

      expect(act).toThrow(ValidationError);
      expect(act).toThrow(
        "Attempt handoff finalization grouped reporting disposition summary requires each group count split to add up to group.resultCount."
      );
    });

    it("should fail loudly when an invoked group reports blocked results", () => {
      const act = () =>
        deriveAttemptHandoffFinalizationGroupedReportingDispositionSummary(
          createGroupedReportingSummary([
            createInvokedReportingGroup({
              resultCount: 2,
              invokedResultCount: 0,
              blockedResultCount: 2
            })
          ])
        );

      expect(act).toThrow(ValidationError);
      expect(act).toThrow(
        'Attempt handoff finalization grouped reporting disposition summary requires "handoff_finalization_invoked" groups to keep all results invoked.'
      );
    });

    it("should fail loudly when a blocked group reports invoked results", () => {
      const act = () =>
        deriveAttemptHandoffFinalizationGroupedReportingDispositionSummary(
          createGroupedReportingSummary([
            createBlockedReportingGroup({
              resultCount: 3,
              invokedResultCount: 3,
              blockedResultCount: 0
            })
          ])
        );

      expect(act).toThrow(ValidationError);
      expect(act).toThrow(
        'Attempt handoff finalization grouped reporting disposition summary requires "handoff_finalization_blocked_unsupported" groups to keep all results blocked.'
      );
    });

    it("should keep the grouped reporting disposition summary shape minimal without leaking grouped reporting detail", () => {
      const summary =
        deriveAttemptHandoffFinalizationGroupedReportingDispositionSummary(
          createGroupedReportingSummary([createInvokedReportingGroup()])
        ) as Record<string, unknown>;

      expect(Object.keys(summary).sort()).toEqual(
        [
          "blockedResultCount",
          "groupCount",
          "groupedReportingDispositionBasis",
          "invokedResultCount",
          "reportingDisposition",
          "resultCount"
        ].sort()
      );
    });
  }
);

type GroupedReportingGroupInput = {
  groupKey: AttemptHandoffFinalizationExplanationCode;
  resultCount: number;
  invokedResultCount: number;
  blockedResultCount: number;
};

function createGroupedReportingSummary(
  groups: GroupedReportingGroupInput[]
): AttemptHandoffFinalizationGroupedReportingSummary {
  const resultCount = groups.reduce((sum, group) => sum + group.resultCount, 0);
  const invokedResultCount = groups.reduce(
    (sum, group) => sum + group.invokedResultCount,
    0
  );
  const blockedResultCount = groups.reduce(
    (sum, group) => sum + group.blockedResultCount,
    0
  );

  return {
    groupedReportingBasis: "handoff_finalization_grouped_projection_summary",
    resultCount,
    invokedResultCount,
    blockedResultCount,
    groups
  };
}

function createInvokedReportingGroup(
  overrides: Partial<GroupedReportingGroupInput> = {}
): GroupedReportingGroupInput {
  return {
    groupKey: "handoff_finalization_invoked",
    resultCount: 3,
    invokedResultCount: 3,
    blockedResultCount: 0,
    ...overrides
  };
}

function createBlockedReportingGroup(
  overrides: Partial<GroupedReportingGroupInput> = {}
): GroupedReportingGroupInput {
  return {
    groupKey: "handoff_finalization_blocked_unsupported",
    resultCount: 2,
    invokedResultCount: 0,
    blockedResultCount: 2,
    ...overrides
  };
}
