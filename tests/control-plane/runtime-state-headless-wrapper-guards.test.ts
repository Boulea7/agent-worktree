import { describe, expect, it } from "vitest";

import { ValidationError } from "../../src/core/errors.js";
import {
  normalizeHeadlessContextBatchWrapper,
  normalizeHeadlessContextWrapper,
  normalizeHeadlessViewBatchWrapper,
  normalizeHeadlessTargetBatchWrapper,
  normalizeHeadlessTargetWrapper
} from "../../src/control-plane/runtime-state-headless-wrapper-guards.js";

describe("control-plane runtime-state headless-wrapper-guards helpers", () => {
  it("should snapshot target wrapper values when the wrapper is valid", () => {
    const wrapper = {
      headlessWaitCandidate: {
        candidate: {},
        headlessContext: {
          context: {},
          headlessView: {}
        }
      }
    };

    const result = normalizeHeadlessTargetWrapper(wrapper, {
      context: "Execution session spawn headless wait request",
      nestedKey: "headlessWaitCandidate",
      wrapperKey: "headlessWaitTarget"
    });

    expect(result).toEqual(wrapper);
    expect(result).not.toBe(wrapper);
    expect(result.headlessWaitCandidate).not.toBe(wrapper.headlessWaitCandidate);
  });

  it("should snapshot headless context wrapper values when the wrapper is valid", () => {
    const wrapper = {
      headlessContext: {
        context: {},
        headlessView: {}
      }
    };

    const result = normalizeHeadlessContextWrapper(wrapper, {
      context: "Execution session spawn headless wait candidate",
      wrapperKey: "headlessContext"
    });

    expect(result).toEqual(wrapper);
    expect(result).not.toBe(wrapper);
    expect(result.headlessContext).not.toBe(wrapper.headlessContext);
  });

  it("should reject malformed headless context wrappers", () => {
    expect(() =>
      normalizeHeadlessContextWrapper(undefined as never, {
        context: "Execution session spawn headless wait candidate",
        wrapperKey: "headlessContext"
      })
    ).toThrow(
      "Execution session spawn headless wait candidate requires a headlessContext wrapper."
    );

    expect(() =>
      normalizeHeadlessContextWrapper(
        {
          headlessContext: {}
        },
        {
          context: "Execution session spawn headless wait candidate",
          wrapperKey: "headlessContext"
        }
      )
    ).toThrow(
      "Execution session spawn headless wait candidate requires headlessContext to include context and headlessView objects."
    );
  });

  it("should reject prototype-backed wrappers instead of accepting inherited wrapper properties", () => {
    const prototypeBackedContextWrapper = Object.create({
      headlessContext: {
        context: {},
        headlessView: {}
      }
    });

    expect(() =>
      normalizeHeadlessContextWrapper(prototypeBackedContextWrapper, {
        context: "Execution session spawn headless wait candidate",
        wrapperKey: "headlessContext"
      })
    ).toThrow(
      "Execution session spawn headless wait candidate requires a headlessContext wrapper."
    );

    const prototypeBackedTargetWrapper = Object.create({
      headlessWaitCandidate: {
        candidate: {},
        headlessContext: {
          context: {},
          headlessView: {}
        }
      }
    });

    expect(() =>
      normalizeHeadlessTargetWrapper(prototypeBackedTargetWrapper, {
        context: "Execution session spawn headless wait request",
        nestedKey: "headlessWaitCandidate",
        wrapperKey: "headlessWaitTarget"
      })
    ).toThrow(
      "Execution session spawn headless wait request requires a headlessWaitTarget wrapper."
    );
  });

  it("should reject non-object target wrappers and wrappers missing the nested key", () => {
    expect(() =>
      normalizeHeadlessTargetWrapper(undefined as never, {
        context: "Execution session spawn headless wait request",
        nestedKey: "headlessWaitCandidate",
        wrapperKey: "headlessWaitTarget"
      })
    ).toThrow(ValidationError);
    expect(() =>
      normalizeHeadlessTargetWrapper(
        {},
        {
          context: "Execution session spawn headless wait request",
          nestedKey: "headlessWaitCandidate",
          wrapperKey: "headlessWaitTarget"
        }
      )
    ).toThrow(
      "Execution session spawn headless wait request requires a headlessWaitTarget wrapper."
    );
  });

  it("should reject a nested wrapper that is not an object", () => {
    expect(() =>
      normalizeHeadlessTargetWrapper(
        {
          headlessWaitCandidate: null
        },
        {
          context: "Execution session spawn headless wait request",
          nestedKey: "headlessWaitCandidate",
          wrapperKey: "headlessWaitTarget"
        }
      )
    ).toThrow(
      "Execution session spawn headless wait request requires headlessWaitTarget.headlessWaitCandidate to be an object."
    );
  });

  it("should reject nested wrappers missing candidate or headlessContext objects", () => {
    expect(() =>
      normalizeHeadlessTargetWrapper(
        {
          headlessWaitCandidate: {
            headlessContext: {}
          }
        },
        {
          context: "Execution session spawn headless wait request",
          nestedKey: "headlessWaitCandidate",
          wrapperKey: "headlessWaitTarget"
        }
      )
    ).toThrow(
      "Execution session spawn headless wait request requires headlessWaitTarget.headlessWaitCandidate to include candidate and headlessContext objects."
    );

    expect(() =>
      normalizeHeadlessTargetWrapper(
        {
          headlessCloseCandidate: {
            candidate: {},
            headlessContext: []
          }
        },
        {
          context: "Execution session spawn headless close request",
          nestedKey: "headlessCloseCandidate",
          wrapperKey: "headlessCloseTarget"
        }
      )
    ).toThrow(
      "Execution session spawn headless close request requires headlessCloseTarget.headlessCloseCandidate to include candidate and headlessContext objects."
    );
  });

  it("should reject nested wrappers whose headlessContext companion omits context or headlessView", () => {
    expect(() =>
      normalizeHeadlessTargetWrapper(
        {
          headlessWaitCandidate: {
            candidate: {},
            headlessContext: {}
          }
        },
        {
          context: "Execution session spawn headless wait request",
          nestedKey: "headlessWaitCandidate",
          wrapperKey: "headlessWaitTarget"
        }
      )
    ).toThrow(
      "Execution session spawn headless wait request requires headlessWaitTarget.headlessWaitCandidate.headlessContext to include context and headlessView objects."
    );
  });

  it("should snapshot batch wrapper values when the companion wrapper is valid", () => {
    const wrapper = {
      headlessContextBatch: {
        headlessViewBatch: {
          headlessRecordBatch: {
            results: []
          },
          view: {}
        },
        results: []
      },
      results: []
    };

    const result = normalizeHeadlessTargetBatchWrapper(wrapper, {
      context: "Execution session spawn headless wait request batch",
      wrapperKey: "headlessWaitCandidateBatch",
      companionKey: "headlessContextBatch"
    });

    expect(result).toEqual(wrapper);
    expect(result).not.toBe(wrapper);
    expect(result.results).toBe(wrapper.results);
    expect(result.headlessContextBatch).not.toBe(wrapper.headlessContextBatch);
  });

  it("should reject malformed target batch companions even when results is an array", () => {
    expect(() =>
      normalizeHeadlessTargetBatchWrapper(
        {
          results: []
        },
        {
          context: "Execution session spawn headless wait request batch",
          wrapperKey: "headlessWaitCandidateBatch",
          companionKey: "headlessContextBatch"
        }
      )
    ).toThrow(
      "Execution session spawn headless wait request batch requires headlessWaitCandidateBatch to include a valid headlessContextBatch companion wrapper."
    );
  });

  it("should snapshot headless view batch wrapper values when nested objects are valid", () => {
    const wrapper = {
      headlessRecordBatch: {
        results: []
      },
      view: {}
    };

    const result = normalizeHeadlessViewBatchWrapper(wrapper, {
      context: "Execution session spawn headless context batch",
      wrapperKey: "headlessViewBatch"
    });

    expect(result).toEqual(wrapper);
    expect(result).not.toBe(wrapper);
    expect(result.headlessRecordBatch).not.toBe(wrapper.headlessRecordBatch);
  });

  it("should reject malformed headless view batch wrappers", () => {
    expect(() =>
      normalizeHeadlessViewBatchWrapper(null as never, {
        context: "Execution session spawn headless context batch",
        wrapperKey: "headlessViewBatch"
      })
    ).toThrow(
      "Execution session spawn headless context batch requires a headlessViewBatch wrapper."
    );

    expect(() =>
      normalizeHeadlessViewBatchWrapper(
        {
          headlessRecordBatch: []
        },
        {
          context: "Execution session spawn headless context batch",
          wrapperKey: "headlessViewBatch"
        }
      )
    ).toThrow(
      "Execution session spawn headless context batch requires headlessViewBatch to include headlessRecordBatch and view objects."
    );
  });

  it("should snapshot headless context batch wrapper values when nested objects are valid", () => {
    const wrapper = {
      headlessViewBatch: {
        headlessRecordBatch: {
          results: []
        },
        view: {}
      },
      results: []
    };

    const result = normalizeHeadlessContextBatchWrapper(wrapper, {
      context: "Execution session spawn headless wait candidate batch",
      wrapperKey: "headlessContextBatch"
    });

    expect(result).toEqual(wrapper);
    expect(result).not.toBe(wrapper);
    expect(result.headlessViewBatch).not.toBe(wrapper.headlessViewBatch);
  });

  it("should snapshot nested getter-backed values so callers can reuse the normalized wrappers", () => {
    let nestedWrapperReads = 0;
    let resultsReads = 0;
    let companionReads = 0;

    const targetWrapper = {};
    Object.defineProperty(targetWrapper, "headlessWaitCandidate", {
      configurable: true,
      enumerable: true,
      get() {
        nestedWrapperReads += 1;

        if (nestedWrapperReads > 1) {
          throw new Error("nested wrapper getter read twice");
        }

        return {
          candidate: {},
          headlessContext: {
            context: {},
            headlessView: {}
          }
        };
      }
    });

    const normalizedTarget = normalizeHeadlessTargetWrapper(targetWrapper, {
      context: "Execution session spawn headless wait request",
      nestedKey: "headlessWaitCandidate",
      wrapperKey: "headlessWaitTarget"
    }) as Record<string, unknown>;

    expect(normalizedTarget.headlessWaitCandidate).toEqual({
      candidate: {},
      headlessContext: {
        context: {},
        headlessView: {}
      }
    });
    expect(normalizedTarget.headlessWaitCandidate).toEqual({
      candidate: {},
      headlessContext: {
        context: {},
        headlessView: {}
      }
    });
    expect(nestedWrapperReads).toBe(1);

    const batchWrapper = {};
    Object.defineProperty(batchWrapper, "results", {
      enumerable: true,
      get() {
        resultsReads += 1;

        if (resultsReads > 1) {
          throw new Error("results getter read twice");
        }

        return [];
      }
    });
    Object.defineProperty(batchWrapper, "headlessContextBatch", {
      enumerable: true,
      get() {
        companionReads += 1;

        if (companionReads > 1) {
          throw new Error("companion getter read twice");
        }

        return {
          headlessViewBatch: {
            headlessRecordBatch: {
              results: []
            },
            view: {}
          },
          results: []
        };
      }
    });

    const normalizedBatch = normalizeHeadlessTargetBatchWrapper(batchWrapper, {
      context: "Execution session spawn headless wait request batch",
      wrapperKey: "headlessWaitTargetBatch",
      companionKey: "headlessContextBatch"
    }) as Record<string, unknown>;

    expect(normalizedBatch.results).toEqual([]);
    expect(normalizedBatch.results).toEqual([]);
    expect(normalizedBatch.headlessContextBatch).toEqual({
      headlessViewBatch: {
        headlessRecordBatch: {
          results: []
        },
        view: {}
      },
      results: []
    });
    expect(normalizedBatch.headlessContextBatch).toEqual({
      headlessViewBatch: {
        headlessRecordBatch: {
          results: []
        },
        view: {}
      },
      results: []
    });
    expect(resultsReads).toBe(1);
    expect(companionReads).toBe(1);
  });

  it("should reject malformed headless context batch wrappers", () => {
    expect(() =>
      normalizeHeadlessContextBatchWrapper(undefined as never, {
        context: "Execution session spawn headless wait candidate batch",
        wrapperKey: "headlessContextBatch"
      })
    ).toThrow(
      "Execution session spawn headless wait candidate batch requires a headlessContextBatch wrapper."
    );

    expect(() =>
      normalizeHeadlessContextBatchWrapper(
        {
          headlessViewBatch: {},
          results: {}
        },
        {
          context: "Execution session spawn headless wait candidate batch",
          wrapperKey: "headlessContextBatch"
        }
      )
    ).toThrow(
      "Execution session spawn headless wait candidate batch requires headlessContextBatch to include headlessViewBatch and results."
    );

    expect(() =>
      normalizeHeadlessContextBatchWrapper(
        {
          headlessViewBatch: {
            headlessRecordBatch: {},
            view: {}
          },
          results: []
        },
        {
          context: "Execution session spawn headless wait candidate batch",
          wrapperKey: "headlessContextBatch"
        }
      )
    ).toThrow(
      "Execution session spawn headless wait candidate batch requires headlessContextBatch.headlessViewBatch.headlessRecordBatch.results to be an array."
    );
  });

  it("should reject malformed batch wrappers", () => {
    expect(() =>
      normalizeHeadlessTargetBatchWrapper(null as never, {
        context: "Execution session spawn headless close request batch",
        wrapperKey: "headlessCloseTargetBatch"
      })
    ).toThrow(
      "Execution session spawn headless close request batch requires a headlessCloseTargetBatch wrapper."
    );

    expect(() =>
      normalizeHeadlessTargetBatchWrapper(
        {
          results: {}
        },
        {
          context: "Execution session spawn headless close request batch",
          wrapperKey: "headlessCloseTargetBatch"
        }
      )
    ).toThrow(
      "Execution session spawn headless close request batch requires headlessCloseTargetBatch.results to be an array."
    );
  });
});
