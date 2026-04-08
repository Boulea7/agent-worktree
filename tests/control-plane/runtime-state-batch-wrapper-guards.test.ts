import { describe, expect, it } from "vitest";

import { ValidationError } from "../../src/core/errors.js";
import {
  normalizeBatchWrapper,
  normalizeBatchWrapperItems
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
    expect(() =>
      normalizeBatchWrapper(
        undefined as never,
        "Execution session close consume batch input must be an object."
      )
    ).toThrow(ValidationError);
    expect(() =>
      normalizeBatchWrapper(
        undefined as never,
        "Execution session close consume batch input must be an object."
      )
    ).toThrow("Execution session close consume batch input must be an object.");
    expect(() =>
      normalizeBatchWrapper(
        null as never,
        "Execution session close consume batch input must be an object."
      )
    ).toThrow("Execution session close consume batch input must be an object.");
    expect(() =>
      normalizeBatchWrapper(
        [] as never,
        "Execution session close consume batch input must be an object."
      )
    ).toThrow("Execution session close consume batch input must be an object.");
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
    expect(() =>
      normalizeBatchWrapperItems(
        {},
        "Execution session close target apply batch requires targets to be an array."
      )
    ).toThrow(ValidationError);
    expect(() =>
      normalizeBatchWrapperItems(
        {},
        "Execution session close target apply batch requires targets to be an array."
      )
    ).toThrow(
      "Execution session close target apply batch requires targets to be an array."
    );
    expect(() =>
      normalizeBatchWrapperItems(
        undefined as never,
        "Execution session close target apply batch requires targets to be an array."
      )
    ).toThrow(
      "Execution session close target apply batch requires targets to be an array."
    );
  });
});
