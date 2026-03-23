import type {
  ExecutionSessionSpawnHeadlessInput,
  ExecutionSessionSpawnHeadlessInputInput
} from "./types.js";

export function deriveExecutionSessionSpawnHeadlessInput(
  input: ExecutionSessionSpawnHeadlessInputInput
): ExecutionSessionSpawnHeadlessInput {
  const { prompt, cwd, timeoutMs, abortSignal } = input.execution;

  return {
    prompt,
    ...(cwd === undefined ? {} : { cwd }),
    ...(timeoutMs === undefined ? {} : { timeoutMs }),
    ...(abortSignal === undefined ? {} : { abortSignal }),
    attempt: input.effects.lineage
  };
}
