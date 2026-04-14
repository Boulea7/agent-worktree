import { ValidationError } from "../core/errors.js";
import {
  validateDownstreamIdentityIngress
} from "./downstream-identity-guardrails.js";
import {
  normalizeSelectionObjectArrayEntry,
  validateSelectionObjectInput,
  normalizeSelectionArrayProperty,
  normalizeSelectionOptionalFunctionProperty,
  normalizeSelectionRequiredFunctionProperty
} from "./entry-validation.js";
import { applyAttemptHandoffFinalization } from "./handoff-finalization-apply.js";
import type {
  AttemptHandoffFinalizationApply,
  AttemptHandoffFinalizationApplyBatch,
  AttemptHandoffFinalizationApplyBatchInput
} from "./types.js";

export async function applyAttemptHandoffFinalizationBatch(
  input: AttemptHandoffFinalizationApplyBatchInput
): Promise<AttemptHandoffFinalizationApplyBatch> {
  validateSelectionObjectInput(
    input,
    "Attempt handoff finalization apply batch input must be an object."
  );
  const requests = normalizeSelectionArrayProperty(
    input,
    "requests",
    "Attempt handoff finalization apply batch requires requests to be an array."
  ) as AttemptHandoffFinalizationApplyBatchInput["requests"];
  const invokeHandoffFinalization = normalizeSelectionRequiredFunctionProperty(
    input,
    "invokeHandoffFinalization",
    "Attempt handoff finalization apply batch requires invokeHandoffFinalization to be a function."
  ) as AttemptHandoffFinalizationApplyBatchInput["invokeHandoffFinalization"];
  const resolveHandoffFinalizationCapability =
    normalizeSelectionOptionalFunctionProperty(
      input,
      "resolveHandoffFinalizationCapability",
      "Attempt handoff finalization apply batch requires resolveHandoffFinalizationCapability to be a function when provided."
    ) as AttemptHandoffFinalizationApplyBatchInput["resolveHandoffFinalizationCapability"];
  const normalizedRequests: AttemptHandoffFinalizationApplyBatchInput["requests"][number][] =
    [];

  for (let index = 0; index < requests.length; index += 1) {
    normalizedRequests.push(
      normalizeSelectionObjectArrayEntry<
        AttemptHandoffFinalizationApplyBatchInput["requests"][number]
      >(
        requests,
        index,
        "Attempt handoff finalization apply batch requires requests entries to be objects."
      )
    );
  }

  validateDownstreamIdentityIngress(normalizedRequests, {
    required:
      "Attempt handoff finalization apply batch requires requests entries to include non-empty taskId, attemptId, and runtime strings.",
    singleTask:
      "Attempt handoff finalization apply batch requires requests from a single taskId.",
    unique:
      "Attempt handoff finalization apply batch requires requests to use unique (taskId, attemptId, runtime) identities."
  });
  const results: AttemptHandoffFinalizationApply[] = [];

  for (let index = 0; index < normalizedRequests.length; index += 1) {
    const request = normalizedRequests[index]!;
    const result = await applyAttemptHandoffFinalization({
      request,
      invokeHandoffFinalization,
      ...(resolveHandoffFinalizationCapability === undefined
        ? {}
        : {
            resolveHandoffFinalizationCapability
          })
    });

    if (result === undefined) {
      throw new ValidationError(
        "Attempt handoff finalization apply batch requires each request to produce an apply result."
      );
    }

    results.push(result);
  }

  return {
    results
  };
}
