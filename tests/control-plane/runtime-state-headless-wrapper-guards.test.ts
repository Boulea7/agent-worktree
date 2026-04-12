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
  it("should return the same target wrapper reference when the wrapper is valid", () => {
    const wrapper = {
      headlessWaitCandidate: {
        candidate: {},
        headlessContext: {
          context: {},
          headlessView: {}
        }
      }
    };

    expect(
      normalizeHeadlessTargetWrapper(wrapper, {
        context: "Execution session spawn headless wait request",
        nestedKey: "headlessWaitCandidate",
        wrapperKey: "headlessWaitTarget"
      })
    ).toBe(wrapper);
  });

  it("should return the same headless context wrapper reference when the wrapper is valid", () => {
    const wrapper = {
      headlessContext: {
        context: {},
        headlessView: {}
      }
    };

    expect(
      normalizeHeadlessContextWrapper(wrapper, {
        context: "Execution session spawn headless wait candidate",
        wrapperKey: "headlessContext"
      })
    ).toBe(wrapper);
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

  it("should return the same batch wrapper reference when the companion wrapper is valid", () => {
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

    expect(
      normalizeHeadlessTargetBatchWrapper(wrapper, {
        context: "Execution session spawn headless wait request batch",
        wrapperKey: "headlessWaitCandidateBatch",
        companionKey: "headlessContextBatch"
      })
    ).toBe(wrapper);
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

  it("should return the same headless view batch wrapper reference when nested objects are valid", () => {
    const wrapper = {
      headlessRecordBatch: {
        results: []
      },
      view: {}
    };

    expect(
      normalizeHeadlessViewBatchWrapper(wrapper, {
        context: "Execution session spawn headless context batch",
        wrapperKey: "headlessViewBatch"
      })
    ).toBe(wrapper);
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

  it("should return the same headless context batch wrapper reference when nested objects are valid", () => {
    const wrapper = {
      headlessViewBatch: {
        headlessRecordBatch: {
          results: []
        },
        view: {}
      },
      results: []
    };

    expect(
      normalizeHeadlessContextBatchWrapper(wrapper, {
        context: "Execution session spawn headless wait candidate batch",
        wrapperKey: "headlessContextBatch"
      })
    ).toBe(wrapper);
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
