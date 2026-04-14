import { ValidationError } from "../core/errors.js";
import { readSelectionValue } from "./entry-validation.js";

interface DownstreamIdentityEntry {
  attemptId: unknown;
  runtime: unknown;
  taskId: unknown;
}

interface DownstreamIdentityIngressMessages {
  required: string;
  singleTask: string;
  unique: string;
}

export function validateDownstreamIdentityIngress(
  entries: readonly DownstreamIdentityEntry[],
  messages: DownstreamIdentityIngressMessages
): void {
  validateDownstreamRequiredIdentityFields(entries, messages.required);
  validateDownstreamSingleTaskBoundary(entries, messages.singleTask);
  validateDownstreamUniqueIdentity(entries, messages.unique);
}

export function validateDownstreamRequiredIdentityFields(
  entries: readonly DownstreamIdentityEntry[],
  message: string
): void {
  for (const entry of entries) {
    if (
      normalizeComparableIdentityField(entry, "taskId", message) === undefined ||
      normalizeComparableIdentityField(entry, "attemptId", message) ===
        undefined ||
      normalizeComparableIdentityField(entry, "runtime", message) === undefined
    ) {
      throw new ValidationError(message);
    }
  }
}

export function validateDownstreamSingleTaskBoundary(
  entries: readonly DownstreamIdentityEntry[],
  message: string
): void {
  let expectedTaskId: string | undefined;

  for (const entry of entries) {
    const normalizedTaskId = normalizeComparableIdentityField(
      entry,
      "taskId",
      message
    );

    if (normalizedTaskId === undefined) {
      continue;
    }

    if (expectedTaskId === undefined) {
      expectedTaskId = normalizedTaskId;
      continue;
    }

    if (normalizedTaskId !== expectedTaskId) {
      throw new ValidationError(message);
    }
  }
}

export function validateDownstreamUniqueIdentity(
  entries: readonly DownstreamIdentityEntry[],
  message: string
): void {
  const seenIdentities = new Set<string>();

  for (const entry of entries) {
    const identity = deriveNormalizedIdentity(entry, message);

    if (identity === undefined) {
      continue;
    }

    if (seenIdentities.has(identity)) {
      throw new ValidationError(message);
    }

    seenIdentities.add(identity);
  }
}

function deriveNormalizedIdentity(
  entry: DownstreamIdentityEntry,
  message: string
): string | undefined {
  const normalizedTaskId = normalizeComparableIdentityField(
    entry,
    "taskId",
    message
  );
  const normalizedAttemptId = normalizeComparableIdentityField(
    entry,
    "attemptId",
    message
  );
  const normalizedRuntime = normalizeComparableIdentityField(
    entry,
    "runtime",
    message
  );

  if (
    normalizedTaskId === undefined ||
    normalizedAttemptId === undefined ||
    normalizedRuntime === undefined
  ) {
    return undefined;
  }

  return `${normalizedTaskId}\u0000${normalizedAttemptId}\u0000${normalizedRuntime}`;
}

function normalizeComparableIdentityField(
  entry: DownstreamIdentityEntry,
  key: keyof DownstreamIdentityEntry,
  message: string
): string | undefined {
  if (!isRecord(entry)) {
    throw new ValidationError(message);
  }

  return normalizeComparableIdentityPart(readSelectionValue(entry, key, message));
}

function normalizeComparableIdentityPart(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalizedValue = value.trim();

  return normalizedValue.length > 0 ? normalizedValue : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
