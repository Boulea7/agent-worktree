import { applyExecutionSessionSpawnHeadlessInput } from "./runtime-state-spawn-headless-apply.js";
import type {
  ExecutionSessionSpawnHeadlessExecute,
  ExecutionSessionSpawnHeadlessExecuteInput
} from "./types.js";

export async function executeExecutionSessionSpawnHeadless(
  input: ExecutionSessionSpawnHeadlessExecuteInput
): Promise<ExecutionSessionSpawnHeadlessExecute> {
  const headlessApply = await applyExecutionSessionSpawnHeadlessInput({
    childAttemptId: input.childAttemptId,
    request: input.request,
    execution: input.execution,
    invokeSpawn: input.invokeSpawn
  });
  const executionResult = await input.executeHeadless(headlessApply.headlessInput);

  return {
    headlessApply,
    executionResult
  };
}
