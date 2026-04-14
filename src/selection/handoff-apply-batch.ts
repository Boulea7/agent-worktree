import { ValidationError } from "../core/errors.js";
import {
  validateDownstreamIdentityIngress
} from "./downstream-identity-guardrails.js";
import {
  normalizeSelectionObjectArrayEntry,
  normalizeSelectionArrayProperty,
  normalizeSelectionOptionalFunctionProperty,
  normalizeSelectionRequiredFunctionProperty
} from "./entry-validation.js";
import { applyAttemptHandoff } from "./handoff-apply.js";
import type {
  AttemptHandoffApply,
  AttemptHandoffApplyBatch,
  AttemptHandoffApplyBatchInput
} from "./types.js";

export async function applyAttemptHandoffBatch(
  input: AttemptHandoffApplyBatchInput
): Promise<AttemptHandoffApplyBatch> {
  const normalizedInput = validateInput(input);
  const requests: AttemptHandoffApplyBatchInput["requests"][number][] = [];

  for (let index = 0; index < normalizedInput.requests.length; index += 1) {
    requests.push(
      normalizeSelectionObjectArrayEntry<
        AttemptHandoffApplyBatchInput["requests"][number]
      >(
        normalizedInput.requests,
        index,
        "Attempt handoff apply batch requires requests entries to be objects."
      )
    );
  }

  validateDownstreamIdentityIngress(requests, {
    required:
      "Attempt handoff apply batch requires requests entries to include non-empty taskId, attemptId, and runtime strings.",
    singleTask:
      "Attempt handoff apply batch requires requests from a single taskId.",
    unique:
      "Attempt handoff apply batch requires requests to use unique (taskId, attemptId, runtime) identities."
  });
  const results: AttemptHandoffApply[] = [];

  for (let index = 0; index < requests.length; index += 1) {
    const request = requests[index]!;
    const result = await applyAttemptHandoff({
      request,
      invokeHandoff: normalizedInput.invokeHandoff,
      ...(normalizedInput.resolveHandoffCapability === undefined
        ? {}
        : {
            resolveHandoffCapability: normalizedInput.resolveHandoffCapability
          })
    });

    if (result === undefined) {
      throw new ValidationError(
        "Attempt handoff apply batch requires each request to produce an apply result."
      );
    }

    results.push(result);
  }

  return {
    results
  };
}

function validateInput(
  value: unknown
): Pick<
  AttemptHandoffApplyBatchInput,
  "requests" | "invokeHandoff" | "resolveHandoffCapability"
> {
  if (!isRecord(value)) {
    throw new ValidationError(
      "Attempt handoff apply batch input must be an object."
    );
  }

  const resolveHandoffCapability = normalizeSelectionOptionalFunctionProperty(
    value,
    "resolveHandoffCapability",
    "Attempt handoff apply batch requires resolveHandoffCapability to be a function when provided."
  ) as AttemptHandoffApplyBatchInput["resolveHandoffCapability"];

  return {
    requests: normalizeSelectionArrayProperty(
      value,
      "requests",
      "Attempt handoff apply batch requires requests to be an array."
    ) as AttemptHandoffApplyBatchInput["requests"],
    invokeHandoff: normalizeSelectionRequiredFunctionProperty(
      value,
      "invokeHandoff",
      "Attempt handoff apply batch requires invokeHandoff to be a function."
    ) as AttemptHandoffApplyBatchInput["invokeHandoff"],
    ...(resolveHandoffCapability === undefined
      ? {}
      : { resolveHandoffCapability })
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
