import {
  runSubprocess,
  subprocessFailureKinds,
  type SubprocessFailureKind
} from "../adapters/headless.js";
import { RuntimeError, ValidationError } from "../core/errors.js";
import { deriveAttemptVerificationSummary } from "./derive.js";
import { deriveAttemptVerificationPayload } from "./ingest.js";
import type {
  AttemptVerificationCommandCheck,
  AttemptVerificationExecutedCheck,
  AttemptVerificationExecutionInput,
  AttemptVerificationExecutionResult
} from "./types.js";

const knownFailureKinds = new Set<SubprocessFailureKind>(subprocessFailureKinds);

export async function executeAttemptVerification(
  input: AttemptVerificationExecutionInput
): Promise<AttemptVerificationExecutionResult> {
  const checks = normalizeCommandChecks(input.checks);
  const runner = input.runner ?? runSubprocess;
  const executedChecks: AttemptVerificationExecutedCheck[] = [];

  for (const check of checks) {
    try {
      const result = await runner(check.executable, [...check.args], {
        ...(check.cwd === undefined ? {} : { cwd: check.cwd }),
        ...(check.env === undefined ? {} : { env: check.env }),
        ...(check.timeoutMs === undefined ? {} : { timeoutMs: check.timeoutMs })
      });
      const normalizedResult = normalizeSubprocessResult(result);

      executedChecks.push({
        name: check.name,
        required: check.required,
        status: normalizedResult.exitCode === 0 ? "passed" : "failed",
        exitCode: normalizedResult.exitCode
      });
    } catch (error) {
      if (error instanceof RuntimeError) {
        const failureKind = extractFailureKind(error);
        const executedCheck: AttemptVerificationExecutedCheck =
          failureKind === undefined
            ? {
                name: check.name,
                required: check.required,
                status: "error"
              }
            : {
                name: check.name,
                required: check.required,
                status: "error",
                failureKind
              };

        executedChecks.push(executedCheck);
        continue;
      }

      throw error;
    }
  }

  const verification = deriveAttemptVerificationPayload({
    state: deriveVerificationState(executedChecks),
    checks: executedChecks.map((check) => ({
      name: check.name,
      status: check.status,
      required: check.required
    }))
  });
  const summary = deriveAttemptVerificationSummary(verification);

  return {
    verification,
    checks: executedChecks,
    summary
  };
}

function normalizeCommandChecks(
  checks: AttemptVerificationExecutionInput["checks"]
): Array<AttemptVerificationCommandCheck & { required: boolean; args: string[] }> {
  if (!Array.isArray(checks)) {
    throw new ValidationError(
      "Verification execution checks must be an array."
    );
  }

  return checks.map((check) => normalizeCommandCheck(check));
}

function normalizeCommandCheck(
  value: unknown
): AttemptVerificationCommandCheck & { required: boolean; args: string[] } {
  if (!isRecord(value)) {
    throw new ValidationError("Verification command check must be an object.");
  }

  const name = normalizeNonEmptyString(value.name, "Verification check name");
  const executable = normalizeNonEmptyString(
    value.executable,
    "Verification check executable"
  );
  const args = normalizeArgs(value.args);
  const required =
    value.required === undefined
      ? false
      : normalizeBoolean(value.required, "Verification check required");
  const cwd =
    value.cwd === undefined
      ? undefined
      : normalizeNonEmptyString(value.cwd, "Verification check cwd");
  const env = value.env === undefined ? undefined : normalizeEnv(value.env);
  const timeoutMs =
    value.timeoutMs === undefined
      ? undefined
      : normalizeTimeoutMs(value.timeoutMs);

  return {
    name,
    executable,
    args,
    required,
    ...(cwd === undefined ? {} : { cwd }),
    ...(env === undefined ? {} : { env }),
    ...(timeoutMs === undefined ? {} : { timeoutMs })
  };
}

function normalizeArgs(value: unknown): string[] {
  if (value === undefined) {
    return [];
  }

  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string")) {
    throw new ValidationError(
      "Verification check args must be an array of strings when provided."
    );
  }

  return [...value];
}

function normalizeEnv(value: unknown): NodeJS.ProcessEnv {
  if (!isRecord(value)) {
    throw new ValidationError(
      "Verification check env must be an object when provided."
    );
  }

  const env: NodeJS.ProcessEnv = {};

  for (const [key, entry] of Object.entries(value)) {
    if (typeof entry !== "string" && entry !== undefined) {
      throw new ValidationError(
        "Verification check env values must be strings when provided."
      );
    }

    env[key] = entry;
  }

  return env;
}

function normalizeTimeoutMs(value: unknown): number {
  if (!Number.isInteger(value) || (value as number) <= 0) {
    throw new ValidationError(
      "Verification check timeoutMs must be a positive integer when provided."
    );
  }

  return value as number;
}

function normalizeSubprocessResult(value: unknown): {
  exitCode: number;
  stdout: string;
  stderr: string;
} {
  if (!isRecord(value)) {
    throw new ValidationError(
      "Verification runner must return a subprocess result object."
    );
  }

  if (!Number.isInteger(value.exitCode)) {
    throw new ValidationError(
      "Verification runner must return an integer exitCode."
    );
  }

  if (typeof value.stdout !== "string") {
    throw new ValidationError(
      "Verification runner must return stdout as a string."
    );
  }

  if (typeof value.stderr !== "string") {
    throw new ValidationError(
      "Verification runner must return stderr as a string."
    );
  }

  const exitCode = value.exitCode as number;
  const stdout = value.stdout as string;
  const stderr = value.stderr as string;

  return {
    exitCode,
    stdout,
    stderr
  };
}

function normalizeBoolean(value: unknown, label: string): boolean {
  if (typeof value !== "boolean") {
    throw new ValidationError(`${label} must be a boolean when provided.`);
  }

  return value;
}

function normalizeNonEmptyString(value: unknown, label: string): string {
  if (typeof value !== "string") {
    throw new ValidationError(`${label} must be a non-empty string.`);
  }

  const normalized = value.trim();

  if (normalized.length === 0) {
    throw new ValidationError(`${label} must be a non-empty string.`);
  }

  return normalized;
}

function deriveVerificationState(
  checks: readonly AttemptVerificationExecutedCheck[]
): string {
  if (checks.length === 0) {
    return "pending";
  }

  if (checks.some((check) => check.status === "failed" || check.status === "error")) {
    return "failed";
  }

  if (checks.some((check) => check.status === "pending")) {
    return "pending";
  }

  return "passed";
}

function extractFailureKind(error: RuntimeError): SubprocessFailureKind | undefined {
  const kind =
    isRecord(error.causeValue) && "kind" in error.causeValue
      ? error.causeValue.kind
      : undefined;

  if (typeof kind === "string" && knownFailureKinds.has(kind as SubprocessFailureKind)) {
    return kind as SubprocessFailureKind;
  }

  return undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
