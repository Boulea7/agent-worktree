import { ValidationError } from "../core/errors.js";

function deriveNestedWrapperPath(
  wrapperKey: string,
  nestedKey: string
): string {
  return wrapperKey === nestedKey ? wrapperKey : `${wrapperKey}.${nestedKey}`;
}

function hasOwnProperty(
  value: Record<string, unknown>,
  key: string
): boolean {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function readOwnProperty(
  value: Record<string, unknown>,
  key: string,
  message: string
): unknown {
  if (!hasOwnProperty(value, key)) {
    throw new ValidationError(message);
  }

  try {
    return value[key];
  } catch {
    throw new ValidationError(message);
  }
}

function readOwnObjectProperty(
  value: Record<string, unknown>,
  key: string,
  message: string
): Record<string, unknown> {
  const property = readOwnProperty(value, key, message);

  if (
    typeof property !== "object" ||
    property === null ||
    Array.isArray(property)
  ) {
    throw new ValidationError(message);
  }

  return property as Record<string, unknown>;
}

function readOwnArrayProperty(
  value: Record<string, unknown>,
  key: string,
  message: string
): readonly unknown[] {
  const property = readOwnProperty(value, key, message);

  if (!Array.isArray(property)) {
    throw new ValidationError(message);
  }

  return property;
}

function snapshotObject(
  value: Record<string, unknown>,
  overrides: Record<string, unknown>
): Record<string, unknown> {
  const snapshot = Object.create(Object.getPrototypeOf(value)) as Record<
    string,
    unknown
  >;

  const descriptors = Object.getOwnPropertyDescriptors(value);

  for (const key of Object.keys(overrides)) {
    delete descriptors[key];
  }

  Object.defineProperties(snapshot, descriptors);

  for (const [key, override] of Object.entries(overrides)) {
    Object.defineProperty(snapshot, key, {
      value: override,
      enumerable: true,
      configurable: true,
      writable: true
    });
  }

  return snapshot;
}

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
  const headlessContext = readOwnObjectProperty(
    wrapper,
    options.wrapperKey,
    `${options.context} requires a ${options.wrapperKey} wrapper.`
  );
  const entryMessage = `${options.context} requires ${options.wrapperKey} to include context and headlessView objects.`;
  const context = readOwnObjectProperty(headlessContext, "context", entryMessage);
  const headlessView = readOwnObjectProperty(
    headlessContext,
    "headlessView",
    entryMessage
  );

  return snapshotObject(wrapper, {
    [options.wrapperKey]: snapshotObject(headlessContext, {
      context,
      headlessView
    })
  }) as T;
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
    !hasOwnProperty(value as Record<string, unknown>, options.nestedKey)
  ) {
    throw new ValidationError(
      `${options.context} requires a ${options.wrapperKey} wrapper.`
    );
  }

  const wrapper = value as Record<string, unknown>;
  const nested = readOwnProperty(
    wrapper,
    options.nestedKey,
    `${options.context} requires a ${options.wrapperKey} wrapper.`
  );
  const nestedPath = deriveNestedWrapperPath(
    options.wrapperKey,
    options.nestedKey
  );

  if (typeof nested !== "object" || nested === null || Array.isArray(nested)) {
    throw new ValidationError(
      `${options.context} requires ${nestedPath} to be an object.`
    );
  }

  const nestedWrapper = nested as Record<string, unknown>;
  const nestedMessage = `${options.context} requires ${nestedPath} to include candidate and headlessContext objects.`;
  const candidate = readOwnObjectProperty(nestedWrapper, "candidate", nestedMessage);
  const headlessContext = readOwnObjectProperty(
    nestedWrapper,
    "headlessContext",
    nestedMessage
  );
  const headlessContextMessage = `${options.context} requires ${nestedPath}.headlessContext to include context and headlessView objects.`;
  const context = readOwnObjectProperty(
    headlessContext,
    "context",
    headlessContextMessage
  );
  const headlessView = readOwnObjectProperty(
    headlessContext,
    "headlessView",
    headlessContextMessage
  );

  return snapshotObject(wrapper, {
    [options.nestedKey]: snapshotObject(nestedWrapper, {
      candidate,
      headlessContext: snapshotObject(headlessContext, {
        context,
        headlessView
      })
    })
  }) as T;
}

export function normalizeHeadlessTargetBatchWrapper<T>(
  value: T,
  options: {
    context: string;
    companionKey?: string;
    wrapperKey: string;
  }
): T {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new ValidationError(
      `${options.context} requires a ${options.wrapperKey} wrapper.`
    );
  }

  const wrapper = value as Record<string, unknown>;
  const results = readOwnArrayProperty(
    wrapper,
    "results",
    `${options.context} requires ${options.wrapperKey}.results to be an array.`
  );
  const overrides: Record<string, unknown> = {
    results
  };

  if (options.companionKey !== undefined) {
    overrides[options.companionKey] = snapshotBatchCompanion(wrapper, options);
  }

  return snapshotObject(wrapper, overrides) as T;
}

function snapshotBatchCompanion(
  value: Record<string, unknown>,
  options: {
    context: string;
    companionKey?: string;
    wrapperKey: string;
  }
): Record<string, unknown> {
  const companionKey = options.companionKey;

  if (companionKey === undefined) {
    throw new ValidationError(
      `${options.context} requires ${options.wrapperKey} to include a valid companion wrapper.`
    );
  }

  const companionMessage = `${options.context} requires ${options.wrapperKey} to include a valid ${companionKey} companion wrapper.`;
  const companion = readOwnObjectProperty(value, companionKey, companionMessage);

  if (companionKey === "headlessContextBatch") {
    return normalizeHeadlessContextBatchWrapper(companion, {
      context: options.context,
      wrapperKey: companionKey
    });
  }

  if (
    companionKey === "headlessWaitCandidateBatch" ||
    companionKey === "headlessCloseCandidateBatch"
  ) {
    return normalizeHeadlessTargetBatchWrapper(companion, {
      context: options.context,
      wrapperKey: companionKey,
      companionKey: "headlessContextBatch"
    });
  }

  return companion;
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
  const wrapperMessage = `${options.context} requires ${options.wrapperKey} to include headlessRecordBatch and view objects.`;
  const headlessRecordBatch = readOwnObjectProperty(
    wrapper,
    "headlessRecordBatch",
    wrapperMessage
  );
  const view = readOwnObjectProperty(wrapper, "view", wrapperMessage);
  const results = readOwnArrayProperty(
    headlessRecordBatch,
    "results",
    `${options.context} requires ${options.wrapperKey}.headlessRecordBatch.results to be an array.`
  );

  return snapshotObject(wrapper, {
    headlessRecordBatch: snapshotObject(headlessRecordBatch, {
      results
    }),
    view
  }) as T;
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
  const wrapperMessage = `${options.context} requires ${options.wrapperKey} to include headlessViewBatch and results.`;
  const headlessViewBatch = readOwnObjectProperty(
    wrapper,
    "headlessViewBatch",
    wrapperMessage
  );
  const results = readOwnArrayProperty(wrapper, "results", wrapperMessage);
  const normalizedHeadlessViewBatch = normalizeHeadlessViewBatchWrapper(
    headlessViewBatch,
    {
      context: options.context,
      wrapperKey: `${options.wrapperKey}.headlessViewBatch`
    }
  );

  return snapshotObject(wrapper, {
    headlessViewBatch: normalizedHeadlessViewBatch,
    results
  }) as T;
}
