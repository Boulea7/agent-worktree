import { ValidationError } from "../core/errors.js";

export function normalizeHeadlessContextWrapper<T>(
  value: T,
  options: {
    context: string;
    wrapperKey: string;
  }
): T {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new ValidationError(
      `${options.context} requires a ${options.wrapperKey} wrapper.`
    );
  }

  const wrapper = value as Record<string, unknown>;
  const headlessContext = wrapper[options.wrapperKey];

  if (
    typeof headlessContext !== "object" ||
    headlessContext === null ||
    Array.isArray(headlessContext)
  ) {
    throw new ValidationError(
      `${options.context} requires a ${options.wrapperKey} wrapper.`
    );
  }

  if (
    !("context" in headlessContext) ||
    typeof headlessContext.context !== "object" ||
    headlessContext.context === null ||
    Array.isArray(headlessContext.context) ||
    !("headlessView" in headlessContext) ||
    typeof headlessContext.headlessView !== "object" ||
    headlessContext.headlessView === null ||
    Array.isArray(headlessContext.headlessView)
  ) {
    throw new ValidationError(
      `${options.context} requires ${options.wrapperKey} to include context and headlessView objects.`
    );
  }

  return value;
}

export function normalizeHeadlessTargetWrapper<T>(
  value: T,
  options: {
    context: string;
    nestedKey: string;
    wrapperKey: string;
  }
): T {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value) ||
    !(options.nestedKey in value)
  ) {
    throw new ValidationError(
      `${options.context} requires a ${options.wrapperKey} wrapper.`
    );
  }

  const nested = (value as Record<string, unknown>)[options.nestedKey];

  if (typeof nested !== "object" || nested === null || Array.isArray(nested)) {
    throw new ValidationError(
      `${options.context} requires ${options.wrapperKey}.${options.nestedKey} to be an object.`
    );
  }

  if (
    !("candidate" in nested) ||
    typeof nested.candidate !== "object" ||
    nested.candidate === null ||
    Array.isArray(nested.candidate) ||
    !("headlessContext" in nested) ||
    typeof nested.headlessContext !== "object" ||
    nested.headlessContext === null ||
    Array.isArray(nested.headlessContext)
  ) {
    throw new ValidationError(
      `${options.context} requires ${options.wrapperKey}.${options.nestedKey} to include candidate and headlessContext objects.`
    );
  }

  return value;
}

export function normalizeHeadlessTargetBatchWrapper<T>(
  value: T,
  options: {
    context: string;
    wrapperKey: string;
  }
): T {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new ValidationError(
      `${options.context} requires a ${options.wrapperKey} wrapper.`
    );
  }

  const results = (value as Record<string, unknown>).results;

  if (!Array.isArray(results)) {
    throw new ValidationError(
      `${options.context} requires ${options.wrapperKey}.results to be an array.`
    );
  }

  return value;
}

export function normalizeHeadlessViewBatchWrapper<T>(
  value: T,
  options: {
    context: string;
    wrapperKey: string;
  }
): T {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new ValidationError(
      `${options.context} requires a ${options.wrapperKey} wrapper.`
    );
  }

  const wrapper = value as Record<string, unknown>;

  if (
    !("headlessRecordBatch" in wrapper) ||
    typeof wrapper.headlessRecordBatch !== "object" ||
    wrapper.headlessRecordBatch === null ||
    Array.isArray(wrapper.headlessRecordBatch) ||
    !("view" in wrapper) ||
    typeof wrapper.view !== "object" ||
    wrapper.view === null ||
    Array.isArray(wrapper.view)
  ) {
    throw new ValidationError(
      `${options.context} requires ${options.wrapperKey} to include headlessRecordBatch and view objects.`
    );
  }

  return value;
}

export function normalizeHeadlessContextBatchWrapper<T>(
  value: T,
  options: {
    context: string;
    wrapperKey: string;
  }
): T {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new ValidationError(
      `${options.context} requires a ${options.wrapperKey} wrapper.`
    );
  }

  const wrapper = value as Record<string, unknown>;

  if (
    !("headlessViewBatch" in wrapper) ||
    typeof wrapper.headlessViewBatch !== "object" ||
    wrapper.headlessViewBatch === null ||
    Array.isArray(wrapper.headlessViewBatch) ||
    !("results" in wrapper) ||
    !Array.isArray(wrapper.results)
  ) {
    throw new ValidationError(
      `${options.context} requires ${options.wrapperKey} to include headlessViewBatch and results.`
    );
  }

  return value;
}
