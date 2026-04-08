import { describe, expect, it } from "vitest";

import { ValidationError } from "../../src/core/errors.js";
import {
  normalizeHeadlessTargetBatchWrapper,
  normalizeHeadlessTargetWrapper
} from "../../src/control-plane/runtime-state-headless-wrapper-guards.js";

describe("control-plane runtime-state headless-wrapper-guards helpers", () => {
  it("should return the same target wrapper reference when the wrapper is valid", () => {
    const wrapper = {
      headlessWaitCandidate: {
        candidate: {},
        headlessContext: {}
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

  it("should return the same batch wrapper reference when results is an array", () => {
    const wrapper = {
      results: []
    };

    expect(
      normalizeHeadlessTargetBatchWrapper(wrapper, {
        context: "Execution session spawn headless wait request batch",
        wrapperKey: "headlessWaitTargetBatch"
      })
    ).toBe(wrapper);
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
