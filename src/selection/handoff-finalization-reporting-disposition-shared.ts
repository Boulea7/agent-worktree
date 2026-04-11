import { ValidationError } from "../core/errors.js";
import type { AttemptHandoffFinalizationGroupedReportingDispositionSummary } from "./types.js";

const validReportingDispositions = new Set<
  AttemptHandoffFinalizationGroupedReportingDispositionSummary["reportingDisposition"]
>(["empty", "all_invoked", "all_blocked", "mixed"]);

export function deriveCanonicalHandoffFinalizationReportingDisposition(
  resultCount: number,
  invokedResultCount: number,
  blockedResultCount: number
): AttemptHandoffFinalizationGroupedReportingDispositionSummary["reportingDisposition"] {
  if (resultCount === 0) {
    return "empty";
  }

  if (invokedResultCount === resultCount) {
    return "all_invoked";
  }

  if (blockedResultCount === resultCount) {
    return "all_blocked";
  }

  return "mixed";
}

export function deriveCanonicalHandoffFinalizationGroupCount(
  reportingDisposition: AttemptHandoffFinalizationGroupedReportingDispositionSummary["reportingDisposition"]
): number {
  switch (reportingDisposition) {
    case "empty":
      return 0;
    case "all_invoked":
    case "all_blocked":
      return 1;
    case "mixed":
      return 2;
  }
}

export function validateHandoffFinalizationReportingDisposition(
  value: unknown,
  message: string
): asserts value is AttemptHandoffFinalizationGroupedReportingDispositionSummary["reportingDisposition"] {
  if (
    typeof value !== "string" ||
    !validReportingDispositions.has(
      value as AttemptHandoffFinalizationGroupedReportingDispositionSummary["reportingDisposition"]
    )
  ) {
    throw new ValidationError(message);
  }
}
