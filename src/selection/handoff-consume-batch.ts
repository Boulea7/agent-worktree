import { consumeAttemptHandoff } from "./handoff-consume.js";
import type {
  AttemptHandoffConsume,
  AttemptHandoffConsumeBatch,
  AttemptHandoffConsumeBatchInput
} from "./types.js";

export async function consumeAttemptHandoffBatch(
  input: AttemptHandoffConsumeBatchInput
): Promise<AttemptHandoffConsumeBatch> {
  const { consumers, invokeHandoff } = input;
  const results: AttemptHandoffConsume[] = [];

  for (const consumer of consumers) {
    results.push(
      await consumeAttemptHandoff({
        consumer,
        invokeHandoff
      })
    );
  }

  return {
    results
  };
}
