import { consumeExecutionSessionClose } from "./runtime-state-close-consume.js";
import type {
  ExecutionSessionCloseConsumeBatch,
  ExecutionSessionCloseConsumeBatchInput
} from "./types.js";

export async function consumeExecutionSessionCloseBatch(
  input: ExecutionSessionCloseConsumeBatchInput
): Promise<ExecutionSessionCloseConsumeBatch> {
  const { consumers, invokeClose } = input;
  const results = [];

  for (const consumer of consumers) {
    results.push(
      await consumeExecutionSessionClose({
        consumer,
        invokeClose
      })
    );
  }

  return {
    results
  };
}
