import type {
  CanonicalAdapterEvent,
  HeadlessExecutionObservation,
  HeadlessExecutionObservationUsage
} from "./types.js";

export function deriveCodexExecutionObservation(
  events: CanonicalAdapterEvent[]
): HeadlessExecutionObservation {
  let threadId: string | undefined;
  let runCompleted = false;
  let turnStatus: string | undefined;
  let lastAgentMessage: string | undefined;
  let usage: HeadlessExecutionObservationUsage | undefined;
  let errorEventCount = 0;
  let lastErrorMessage: string | undefined;

  for (const event of events) {
    if (event.rawType === "thread.started") {
      threadId = getStringProperty(event.payload, "thread_id") ?? threadId;
    }

    if (event.kind === "message_completed") {
      lastAgentMessage = getStringProperty(event.payload, "text") ?? lastAgentMessage;
    }

    if (event.kind === "run_completed") {
      runCompleted = true;
      turnStatus = getStringProperty(event.payload, "status") ?? turnStatus;
      usage = getUsageObservation(event.payload) ?? usage;
    }

    if (event.kind === "error") {
      errorEventCount += 1;
      lastErrorMessage = getStringProperty(event.payload, "message") ?? lastErrorMessage;
    }
  }

  return {
    errorEventCount,
    runCompleted,
    ...(threadId === undefined ? {} : { threadId }),
    ...(turnStatus === undefined ? {} : { turnStatus }),
    ...(lastAgentMessage === undefined ? {} : { lastAgentMessage }),
    ...(usage === undefined ? {} : { usage }),
    ...(lastErrorMessage === undefined ? {} : { lastErrorMessage })
  };
}

function getUsageObservation(
  payload: unknown
): HeadlessExecutionObservationUsage | undefined {
  const usage = getObjectProperty(payload, "usage");

  if (!usage) {
    return undefined;
  }

  const inputTokens =
    getNumberProperty(usage, "input_tokens") ?? getNumberProperty(usage, "inputTokens");
  const outputTokens =
    getNumberProperty(usage, "output_tokens") ?? getNumberProperty(usage, "outputTokens");

  if (inputTokens === undefined && outputTokens === undefined) {
    return undefined;
  }

  return {
    ...(inputTokens === undefined ? {} : { inputTokens }),
    ...(outputTokens === undefined ? {} : { outputTokens })
  };
}

function getStringProperty(
  value: unknown,
  property: string
): string | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const candidate = value[property];
  return typeof candidate === "string" ? candidate : undefined;
}

function getNumberProperty(
  value: unknown,
  property: string
): number | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const candidate = value[property];
  return typeof candidate === "number" ? candidate : undefined;
}

function getObjectProperty(
  value: unknown,
  property: string
): Record<string, unknown> | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const candidate = value[property];
  return isRecord(candidate) ? candidate : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
