import { ValidationError } from "../core/errors.js";
import { adapterSupportsCapability } from "../adapters/catalog.js";
import { deriveExecutionSessionLifecycleDisposition } from "./runtime-state-lifecycle-disposition.js";
import type {
  ExecutionSessionCloseBlockingReason,
  ExecutionSessionCloseReadiness,
  ExecutionSessionCloseReadinessInput
} from "./types.js";

export function deriveExecutionSessionCloseReadiness(
  input: ExecutionSessionCloseReadinessInput
): ExecutionSessionCloseReadiness {
  if (!isRecord(input)) {
    throw new ValidationError(
      "Execution session close readiness input must be an object."
    );
  }

  if (!isRecord(input.context)) {
    throw new ValidationError(
      "Execution session close readiness requires context to be an object."
    );
  }

  if (!isRecord(input.context.record)) {
    throw new ValidationError(
      "Execution session close readiness requires context.record to be an object."
    );
  }

  if (
    input.resolveSessionLifecycleCapability !== undefined &&
    typeof input.resolveSessionLifecycleCapability !== "function"
  ) {
    throw new ValidationError(
      "Execution session close readiness requires resolveSessionLifecycleCapability to be a function when provided."
    );
  }

  const disposition = deriveExecutionSessionLifecycleDisposition({
    context: input.context
  });
  const runtime = normalizeRequiredRuntime(input.context.record.runtime);
  const sessionLifecycleSupported = resolveSessionLifecycleCapability(input, runtime);
  const blockingReasons: ExecutionSessionCloseBlockingReason[] = [];

  if (!sessionLifecycleSupported) {
    blockingReasons.push("session_lifecycle_unsupported");
  }

  if (disposition.alreadyFinal) {
    blockingReasons.push("lifecycle_terminal");
  }

  if (!disposition.hasKnownSession) {
    blockingReasons.push("session_unknown");
  }

  if (normalizeDescendantCoverage(input.descendantCoverage) === "incomplete") {
    blockingReasons.push("descendant_coverage_incomplete");
  }

  if (disposition.wouldAffectDescendants) {
    blockingReasons.push("child_attempts_present");
  }

  return {
    alreadyFinal: disposition.alreadyFinal,
    blockingReasons,
    canClose: blockingReasons.length === 0,
    hasBlockingReasons: blockingReasons.length > 0,
    sessionLifecycleSupported,
    wouldAffectDescendants: disposition.wouldAffectDescendants
  };
}

function resolveSessionLifecycleCapability(
  input: ExecutionSessionCloseReadinessInput,
  runtime: string
): boolean {
  if (input.resolveSessionLifecycleCapability !== undefined) {
    const supported = input.resolveSessionLifecycleCapability(runtime);

    if (typeof supported !== "boolean") {
      throw new ValidationError(
        "Execution session close readiness requires resolveSessionLifecycleCapability to return a boolean."
      );
    }

    return supported;
  }

  try {
    return adapterSupportsCapability(runtime, "sessionLifecycle");
  } catch {
    return false;
  }
}

function normalizeRequiredRuntime(value: unknown): string {
  if (typeof value !== "string") {
    throw new ValidationError(
      "Execution session close readiness requires context.record.runtime to be a non-empty string."
    );
  }

  const normalized = value.trim();

  if (normalized.length === 0) {
    throw new ValidationError(
      "Execution session close readiness requires context.record.runtime to be a non-empty string."
    );
  }

  return normalized;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeDescendantCoverage(
  value: ExecutionSessionCloseReadinessInput["descendantCoverage"]
): "complete" | "incomplete" | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === "complete" || value === "incomplete") {
    return value;
  }

  throw new ValidationError(
    "Execution session close readiness requires descendantCoverage to be \"complete\" or \"incomplete\" when provided."
  );
}
