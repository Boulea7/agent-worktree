import { ValidationError } from "../core/errors.js";

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
      normalizeComparableIdentityPart(entry.taskId) === undefined ||
      normalizeComparableIdentityPart(entry.attemptId) === undefined ||
      normalizeComparableIdentityPart(entry.runtime) === undefined
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
    const normalizedTaskId = normalizeComparableIdentityPart(entry.taskId);

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
    const identity = deriveNormalizedIdentity(entry);

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
  entry: DownstreamIdentityEntry
): string | undefined {
  const normalizedTaskId = normalizeComparableIdentityPart(entry.taskId);
  const normalizedAttemptId = normalizeComparableIdentityPart(entry.attemptId);
  const normalizedRuntime = normalizeComparableIdentityPart(entry.runtime);

  if (
    normalizedTaskId === undefined ||
    normalizedAttemptId === undefined ||
    normalizedRuntime === undefined
  ) {
    return undefined;
  }

  return `${normalizedTaskId}\u0000${normalizedAttemptId}\u0000${normalizedRuntime}`;
}

function normalizeComparableIdentityPart(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalizedValue = value.trim();

  return normalizedValue.length > 0 ? normalizedValue : undefined;
}
