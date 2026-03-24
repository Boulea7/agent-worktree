import { applyExecutionSessionSpawn } from "./runtime-state-spawn-apply.js";
import { deriveExecutionSessionSpawnHeadlessInput } from "./runtime-state-spawn-headless-input.js";
import type {
  ExecutionSessionSpawnHeadlessApply,
  ExecutionSessionSpawnHeadlessApplyInput
} from "./types.js";

export async function applyExecutionSessionSpawnHeadlessInput(
  input: ExecutionSessionSpawnHeadlessApplyInput
): Promise<ExecutionSessionSpawnHeadlessApply> {
  const apply = await applyExecutionSessionSpawn({
    childAttemptId: input.childAttemptId,
    request: input.request,
    invokeSpawn: input.invokeSpawn
  });
  const headlessInput = deriveExecutionSessionSpawnHeadlessInput({
    effects: apply.effects,
    execution: input.execution
  });

  return {
    apply,
    headlessInput
  };
}
