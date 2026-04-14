import { describe, expect, it } from "vitest";

import { ValidationError } from "../../src/core/errors.js";
import {
  deriveAttemptHandoffFinalizationConsumer,
  type AttemptHandoffFinalizationRequest
} from "../../src/selection/internal.js";

describe("selection handoff-finalization-consumer helpers", () => {
  it("should fail loudly when the supplied finalization-consumer input is malformed", () => {
    expect(() =>
      deriveAttemptHandoffFinalizationConsumer(undefined as never)
    ).toThrow(ValidationError);
    expect(() =>
      deriveAttemptHandoffFinalizationConsumer(undefined as never)
    ).toThrow(
      "Attempt handoff finalization consumer input must be an object."
    );
  });

  it("should fail closed when reading the finalization-consumer input through an accessor-shaped input", () => {
    expect(() =>
      deriveAttemptHandoffFinalizationConsumer({
        get request() {
          throw new Error("getter boom");
        }
      } as never)
    ).toThrow(ValidationError);
    expect(() =>
      deriveAttemptHandoffFinalizationConsumer({
        get request() {
          throw new Error("getter boom");
        }
      } as never)
    ).toThrow(
      "Attempt handoff finalization consumer input must be a readable object."
    );
  });

  it("should fail loudly when request is not an object when provided", () => {
    expect(() =>
      deriveAttemptHandoffFinalizationConsumer({
        request: null as never
      })
    ).toThrow(ValidationError);
    expect(() =>
      deriveAttemptHandoffFinalizationConsumer({
        request: null as never
      })
    ).toThrow(
      "Attempt handoff finalization consumer requires request to be an object when provided."
    );
  });

  it("should return undefined when the supplied finalization request is undefined", () => {
    expect(
      deriveAttemptHandoffFinalizationConsumer({
        request: undefined
      })
    ).toBeUndefined();
  });

  it("should fail closed when request or resolver are inherited from the prototype", () => {
    const inheritedInput = Object.create({
      request: createFinalizationRequest(),
      resolveHandoffFinalizationCapability: () => true
    });

    expect(() =>
      deriveAttemptHandoffFinalizationConsumer(inheritedInput as never)
    ).toThrow(ValidationError);
  });

  it("should derive a supported finalization consumer when the runtime resolver returns true", () => {
    expect(
      deriveAttemptHandoffFinalizationConsumer({
        request: createFinalizationRequest({
          taskId: "task_shared",
          attemptId: "att_ready",
          runtime: "codex-cli",
          status: "running",
          sourceKind: "delegated"
        }),
        resolveHandoffFinalizationCapability: () => true
      })
    ).toEqual({
      request: {
        taskId: "task_shared",
        attemptId: "att_ready",
        runtime: "codex-cli",
        status: "running",
        sourceKind: "delegated"
      },
      readiness: {
        blockingReasons: [],
        canConsumeHandoffFinalization: true,
        hasBlockingReasons: false,
        handoffFinalizationSupported: true
      }
    });
  });

  it("should derive a blocked finalization consumer when no runtime resolver is provided", () => {
    expect(
      deriveAttemptHandoffFinalizationConsumer({
        request: createFinalizationRequest()
      })
    ).toEqual({
      request: {
        taskId: "task_shared",
        attemptId: "att_ready",
        runtime: "codex-cli",
        status: "created",
        sourceKind: undefined
      },
      readiness: {
        blockingReasons: ["handoff_finalization_unsupported"],
        canConsumeHandoffFinalization: false,
        hasBlockingReasons: true,
        handoffFinalizationSupported: false
      }
    });
  });

  it("should trim taskId, attemptId, and runtime when deriving a finalization consumer", () => {
    expect(
      deriveAttemptHandoffFinalizationConsumer({
        request: createFinalizationRequest({
          taskId: "  task_shared  ",
          attemptId: "  att_ready  ",
          runtime: "  codex-cli  "
        }),
        resolveHandoffFinalizationCapability: () => true
      })
    ).toEqual({
      request: {
        taskId: "task_shared",
        attemptId: "att_ready",
        runtime: "codex-cli",
        status: "created",
        sourceKind: undefined
      },
      readiness: {
        blockingReasons: [],
        canConsumeHandoffFinalization: true,
        hasBlockingReasons: false,
        handoffFinalizationSupported: true
      }
    });
  });

  it("should fail loudly when the runtime resolver returns a non-boolean readiness value", () => {
    expect(() =>
      deriveAttemptHandoffFinalizationConsumer({
        request: createFinalizationRequest(),
        resolveHandoffFinalizationCapability: (() => "yes") as never
      })
    ).toThrow(ValidationError);
  });

  it("should surface resolver exceptions directly instead of relabeling them as input-read failures", () => {
    const expectedError = new Error("resolver boom");

    expect(() =>
      deriveAttemptHandoffFinalizationConsumer({
        request: createFinalizationRequest(),
        resolveHandoffFinalizationCapability: () => {
          throw expectedError;
        }
      })
    ).toThrow(expectedError);
  });

  it("should fail loudly when resolveHandoffFinalizationCapability is not a function when provided", () => {
    expect(() =>
      deriveAttemptHandoffFinalizationConsumer({
        request: createFinalizationRequest(),
        resolveHandoffFinalizationCapability: "yes" as never
      })
    ).toThrow(
      "Attempt handoff finalization consumer requires resolveHandoffFinalizationCapability to be a function when provided."
    );
  });

  it("should fail loudly when request.taskId is blank-only whitespace", () => {
    const request = {
      ...createFinalizationRequest(),
      taskId: "   "
    } as unknown as AttemptHandoffFinalizationRequest;

    expect(() =>
      deriveAttemptHandoffFinalizationConsumer({
        request
      })
    ).toThrow(
      "Attempt handoff finalization consumer requires request.taskId to be a non-empty string."
    );
  });

  it("should not mutate the supplied finalization request and should return a fresh consumer object", () => {
    const request = Object.freeze(
      createFinalizationRequest({
        sourceKind: "delegated"
      })
    );
    const snapshot = structuredClone(request);

    const consumer = deriveAttemptHandoffFinalizationConsumer({
      request,
      resolveHandoffFinalizationCapability: () => true
    });

    expect(request).toEqual(snapshot);
    expect(consumer).toEqual({
      request: {
        taskId: "task_shared",
        attemptId: "att_ready",
        runtime: "codex-cli",
        status: "created",
        sourceKind: "delegated"
      },
      readiness: {
        blockingReasons: [],
        canConsumeHandoffFinalization: true,
        hasBlockingReasons: false,
        handoffFinalizationSupported: true
      }
    });
    expect(consumer).not.toBeUndefined();
    expect(consumer?.request).not.toBe(request);
  });
});

function createFinalizationRequest(
  overrides: Partial<AttemptHandoffFinalizationRequest> = {}
): AttemptHandoffFinalizationRequest {
  return {
    taskId: "task_shared",
    attemptId: "att_ready",
    runtime: "codex-cli",
    status: "created",
    sourceKind: undefined,
    ...overrides
  };
}
