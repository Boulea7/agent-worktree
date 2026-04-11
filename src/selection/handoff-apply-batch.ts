import { ValidationError } from "../core/errors.js";
import {
  validateDownstreamIdentityIngress
} from "./downstream-identity-guardrails.js";
import { applyAttemptHandoff } from "./handoff-apply.js";
import type {
  AttemptHandoffApply,
  AttemptHandoffApplyBatch,
  AttemptHandoffApplyBatchInput
} from "./types.js";

export async function applyAttemptHandoffBatch(
  input: AttemptHandoffApplyBatchInput
): Promise<AttemptHandoffApplyBatch> {
  validateInput(input);

  for (let index = 0; index < input.requests.length; index += 1) {
    if (
      !Object.prototype.hasOwnProperty.call(input.requests, index) ||
      !isRecord(input.requests[index])
    ) {
      throw new ValidationError(
        "Attempt handoff apply batch requires requests entries to be objects."
      );
    }
  }

  validateDownstreamIdentityIngress(input.requests, {
    required:
      "Attempt handoff apply batch requires requests entries to include non-empty taskId, attemptId, and runtime strings.",
    singleTask:
      "Attempt handoff apply batch requires requests from a single taskId.",
    unique:
      "Attempt handoff apply batch requires requests to use unique (taskId, attemptId, runtime) identities."
  });
  const results: AttemptHandoffApply[] = [];

  for (let index = 0; index < input.requests.length; index += 1) {
    const request = input.requests[index] as AttemptHandoffApplyBatchInput["requests"][number];
    const result = await applyAttemptHandoff({
      request,
      invokeHandoff: input.invokeHandoff,
      ...(input.resolveHandoffCapability === undefined
        ? {}
        : {
            resolveHandoffCapability: input.resolveHandoffCapability
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

function validateInput(value: unknown): void {
  if (!isRecord(value)) {
    throw new ValidationError(
      "Attempt handoff apply batch input must be an object."
    );
  }

  if (!Array.isArray(value.requests)) {
    throw new ValidationError(
      "Attempt handoff apply batch requires requests to be an array."
    );
  }

  if (typeof value.invokeHandoff !== "function") {
    throw new ValidationError(
      "Attempt handoff apply batch requires invokeHandoff to be a function."
    );
  }

  if (
    value.resolveHandoffCapability !== undefined &&
    typeof value.resolveHandoffCapability !== "function"
  ) {
    throw new ValidationError(
      "Attempt handoff apply batch requires resolveHandoffCapability to be a function when provided."
    );
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
