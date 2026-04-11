import { RuntimeError } from "../core/errors.js";
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
    get execution() {
      return input.execution;
    },
    invokeSpawn: input.invokeSpawn
  });
  let executionResult: ExecutionSessionSpawnHeadlessExecute["executionResult"];

  try {
    executionResult = await input.executeHeadless(headlessApply.headlessInput);
  } catch (error) {
    throw new RuntimeError(
      "Headless child execution failed after spawn was recorded.",
      {
        cause: error,
        headlessApply
      }
    );
  }

  return {
    headlessApply,
    executionResult
  };
}
