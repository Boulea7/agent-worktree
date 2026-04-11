import { applyExecutionSessionSpawn } from "./runtime-state-spawn-apply.js";
import { deriveExecutionSessionSpawnEffects } from "./runtime-state-spawn-effects.js";
import { deriveExecutionSessionSpawnHeadlessInput } from "./runtime-state-spawn-headless-input.js";
import { normalizeExecutionSessionSpawnRequest } from "./runtime-state-spawn-request.js";
import type {
  ExecutionSessionSpawnHeadlessApply,
  ExecutionSessionSpawnHeadlessApplyInput
} from "./types.js";

export async function applyExecutionSessionSpawnHeadlessInput(
  input: ExecutionSessionSpawnHeadlessApplyInput
): Promise<ExecutionSessionSpawnHeadlessApply> {
  const request = normalizeExecutionSessionSpawnRequest(input.request);
  const preflightEffects = deriveExecutionSessionSpawnEffects({
    childAttemptId: input.childAttemptId,
    request
  });
  const execution = input.execution;
  const headlessInput = deriveExecutionSessionSpawnHeadlessInput({
    effects: preflightEffects,
    execution
  });
  const apply = await applyExecutionSessionSpawn({
    childAttemptId: input.childAttemptId,
    request,
    invokeSpawn: input.invokeSpawn
  });

  return {
    apply,
    headlessInput
  };
}
