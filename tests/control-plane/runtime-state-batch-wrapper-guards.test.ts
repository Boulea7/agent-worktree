import { describe, expect, it } from "vitest";

import { ValidationError } from "../../src/core/errors.js";
import {
  normalizeBatchWrapper,
  normalizeBatchWrapperItems,
  normalizeBatchWrapperObjectItems,
  readOptionalBatchWrapperProperty,
  readRequiredBatchWrapperProperty
} from "../../src/control-plane/runtime-state-batch-wrapper-guards.js";

describe("control-plane runtime-state batch-wrapper-guards helpers", () => {
  it("should return the same wrapper reference when the wrapper is a valid object", () => {
    const wrapper = {
      requests: []
    };

    expect(
      normalizeBatchWrapper(
        wrapper,
        "Execution session wait apply batch input must be an object."
      )
    ).toBe(wrapper);
  });

  it("should reject non-object batch wrappers", () => {
    for (const value of [undefined, null, [], 0, "wrapper", true]) {
      expect(() =>
        normalizeBatchWrapper(
          value as never,
          "Execution session close consume batch input must be an object."
        )
      ).toThrow(ValidationError);
      expect(() =>
        normalizeBatchWrapper(
          value as never,
          "Execution session close consume batch input must be an object."
        )
      ).toThrow(
        "Execution session close consume batch input must be an object."
      );
    }
  });

  it("should return the same array reference when the collection is valid", () => {
    const consumers = [{}];

    expect(
      normalizeBatchWrapperItems(
        consumers,
        "Execution session wait consume batch requires consumers to be an array."
      )
    ).toBe(consumers);
  });

  it("should reject non-array batch collections", () => {
    for (const value of [undefined, {}, "targets", 123]) {
      expect(() =>
        normalizeBatchWrapperItems(
          value as never,
          "Execution session close target apply batch requires targets to be an array."
        )
      ).toThrow(ValidationError);
      expect(() =>
        normalizeBatchWrapperItems(
          value as never,
          "Execution session close target apply batch requires targets to be an array."
        )
      ).toThrow(
        "Execution session close target apply batch requires targets to be an array."
      );
    }
  });

  it("should return the same array reference when all collection entries are objects", () => {
    const results = [{ candidate: {} }, { candidate: {} }];

    expect(
      normalizeBatchWrapperObjectItems(
        results,
        "Execution session spawn headless wait target batch requires headlessWaitCandidateBatch.results to be an array.",
        "Execution session spawn headless wait target batch requires headlessWaitCandidateBatch.results entries to be objects."
      )
    ).toBe(results);
  });

  it("should reject sparse, primitive, and null object-entry collections", () => {
    const sparseResults = new Array(1);

    expect(() =>
      normalizeBatchWrapperObjectItems(
        sparseResults,
        "Execution session spawn headless close target batch requires headlessCloseCandidateBatch.results to be an array.",
        "Execution session spawn headless close target batch requires headlessCloseCandidateBatch.results entries to be objects."
      )
    ).toThrow(
      "Execution session spawn headless close target batch requires headlessCloseCandidateBatch.results entries to be objects."
    );

    for (const value of [[null], [0], ["candidate"]]) {
      expect(() =>
        normalizeBatchWrapperObjectItems(
          value,
          "Execution session spawn headless close target batch requires headlessCloseCandidateBatch.results to be an array.",
          "Execution session spawn headless close target batch requires headlessCloseCandidateBatch.results entries to be objects."
        )
      ).toThrow(ValidationError);
      expect(() =>
        normalizeBatchWrapperObjectItems(
          value,
          "Execution session spawn headless close target batch requires headlessCloseCandidateBatch.results to be an array.",
          "Execution session spawn headless close target batch requires headlessCloseCandidateBatch.results entries to be objects."
        )
      ).toThrow(
        "Execution session spawn headless close target batch requires headlessCloseCandidateBatch.results entries to be objects."
      );
    }
  });

  it("should convert accessor-backed index failures into validation errors", () => {
    const results = [{}];
    Object.defineProperty(results, "0", {
      configurable: true,
      enumerable: true,
      get() {
        throw new Error("boom");
      }
    });

    expect(() =>
      normalizeBatchWrapperObjectItems(
        results,
        "Execution session spawn headless wait target batch requires headlessWaitCandidateBatch.results to be an array.",
        "Execution session spawn headless wait target batch requires headlessWaitCandidateBatch.results entries to be objects."
      )
    ).toThrow(ValidationError);
    expect(() =>
      normalizeBatchWrapperObjectItems(
        results,
        "Execution session spawn headless wait target batch requires headlessWaitCandidateBatch.results to be an array.",
        "Execution session spawn headless wait target batch requires headlessWaitCandidateBatch.results entries to be objects."
      )
    ).toThrow(
      "Execution session spawn headless wait target batch requires headlessWaitCandidateBatch.results entries to be objects."
    );
  });

  it("should read required own properties and reject inherited or throwing properties", () => {
    const wrapper = {
      consumers: []
    };

    expect(
      readRequiredBatchWrapperProperty(
        wrapper,
        "consumers",
        "Execution session wait consume batch requires consumers to be an array."
      )
    ).toBe(wrapper.consumers);

    const inheritedWrapper = Object.create({
      consumers: []
    });

    expect(() =>
      readRequiredBatchWrapperProperty(
        inheritedWrapper,
        "consumers",
        "Execution session wait consume batch requires consumers to be an array."
      )
    ).toThrow(
      "Execution session wait consume batch requires consumers to be an array."
    );

    const throwingWrapper = {};
    Object.defineProperty(throwingWrapper, "consumers", {
      enumerable: true,
      get() {
        throw new Error("boom");
      }
    });

    expect(() =>
      readRequiredBatchWrapperProperty(
        throwingWrapper,
        "consumers",
        "Execution session wait consume batch requires consumers to be an array."
      )
    ).toThrow(
      "Execution session wait consume batch requires consumers to be an array."
    );
  });

  it("should read optional own properties while rejecting inherited or throwing optional properties", () => {
    const wrapper = {
      timeoutMs: 250
    };

    expect(
      readOptionalBatchWrapperProperty(
        wrapper,
        "timeoutMs",
        "Execution session wait request timeoutMs must be a finite integer greater than 0."
      )
    ).toBe(250);

    expect(
      readOptionalBatchWrapperProperty(
        {},
        "timeoutMs",
        "Execution session wait request timeoutMs must be a finite integer greater than 0."
      )
    ).toBeUndefined();

    const inheritedWrapper = Object.create({
      timeoutMs: 250
    });

    expect(() =>
      readOptionalBatchWrapperProperty(
        inheritedWrapper,
        "timeoutMs",
        "Execution session wait request timeoutMs must be a finite integer greater than 0."
      )
    ).toThrow(
      "Execution session wait request timeoutMs must be a finite integer greater than 0."
    );

    const throwingWrapper = {};
    Object.defineProperty(throwingWrapper, "timeoutMs", {
      enumerable: true,
      get() {
        throw new Error("boom");
      }
    });

    expect(() =>
      readOptionalBatchWrapperProperty(
        throwingWrapper,
        "timeoutMs",
        "Execution session wait request timeoutMs must be a finite integer greater than 0."
      )
    ).toThrow(
      "Execution session wait request timeoutMs must be a finite integer greater than 0."
    );
  });
});
