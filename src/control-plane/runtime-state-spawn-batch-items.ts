import { ValidationError } from "../core/errors.js";
import { deriveExecutionSessionSpawnRequest } from "./runtime-state-spawn-request.js";
import type {
  ExecutionSessionSpawnBatchItems,
  ExecutionSessionSpawnBatchItemsInput,
  ExecutionSessionSpawnEffectsInput
} from "./types.js";

export function deriveExecutionSessionSpawnBatchItems(
  input: ExecutionSessionSpawnBatchItemsInput
): ExecutionSessionSpawnBatchItems {
  const childAttemptIds = normalizeChildAttemptIds(
    input.childAttemptIds,
    input.plan.requestedCount
  );
  const request = deriveExecutionSessionSpawnRequest({
    candidate: input.plan.candidate,
    sourceKind: input.sourceKind
  });

  if (!input.plan.canPlan) {
    return {
      plan: input.plan
    };
  }

  if (request === undefined) {
    throw new ValidationError(
      "Execution session spawn batch items require a plannable spawn request when plan.canPlan is true."
    );
  }

  const items: ExecutionSessionSpawnEffectsInput[] = childAttemptIds.map(
    (childAttemptId) => ({
      childAttemptId,
      request: cloneRequest(request)
    })
  );

  return {
    plan: input.plan,
    items
  };
}

function normalizeChildAttemptIds(
  value: readonly string[],
  requestedCount: number
): string[] {
  if (!Array.isArray(value)) {
    throw new ValidationError(
      "Execution session spawn batch items childAttemptIds must be an array."
    );
  }

  if (value.length !== requestedCount) {
    throw new ValidationError(
      "Execution session spawn batch items childAttemptIds length must match plan.requestedCount."
    );
  }

  const normalizedChildAttemptIds: string[] = [];
  const seenChildAttemptIds = new Set<string>();

  for (const childAttemptId of value) {
    if (typeof childAttemptId !== "string") {
      throw new ValidationError(
        "Execution session spawn batch items childAttemptIds entries must be non-empty strings."
      );
    }

    const normalized = childAttemptId.trim();

    if (normalized.length === 0) {
      throw new ValidationError(
        "Execution session spawn batch items childAttemptIds entries must be non-empty strings."
      );
    }

    if (seenChildAttemptIds.has(normalized)) {
      throw new ValidationError(
        "Execution session spawn batch items childAttemptIds must remain unique after trimming."
      );
    }

    seenChildAttemptIds.add(normalized);
    normalizedChildAttemptIds.push(normalized);
  }

  return normalizedChildAttemptIds;
}

function cloneRequest(request: ExecutionSessionSpawnEffectsInput["request"]) {
  return {
    parentAttemptId: request.parentAttemptId,
    parentRuntime: request.parentRuntime,
    parentSessionId: request.parentSessionId,
    sourceKind: request.sourceKind,
    ...(request.inheritedGuardrails === undefined
      ? {}
      : {
          inheritedGuardrails: {
            ...request.inheritedGuardrails
          }
        })
  };
}
