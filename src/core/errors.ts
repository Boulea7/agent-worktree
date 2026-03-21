export type AgentWorktreeErrorCode =
  | "CONFIG_ERROR"
  | "VALIDATION_ERROR"
  | "NOT_IMPLEMENTED"
  | "RUNTIME_ERROR"
  | "NOT_FOUND"
  | "GIT_ERROR";

export class AgentWorktreeError extends Error {
  public readonly code: AgentWorktreeErrorCode;
  public readonly causeValue: unknown;

  public constructor(
    code: AgentWorktreeErrorCode,
    message: string,
    causeValue?: unknown
  ) {
    super(message);
    this.name = "AgentWorktreeError";
    this.code = code;
    this.causeValue = causeValue;
  }
}

export class ConfigError extends AgentWorktreeError {
  public constructor(message: string, causeValue?: unknown) {
    super("CONFIG_ERROR", message, causeValue);
    this.name = "ConfigError";
  }
}

export class ValidationError extends AgentWorktreeError {
  public constructor(message: string, causeValue?: unknown) {
    super("VALIDATION_ERROR", message, causeValue);
    this.name = "ValidationError";
  }
}

export class InvalidManifestError extends ValidationError {
  public constructor(message: string, causeValue?: unknown) {
    super(message, causeValue);
    this.name = "InvalidManifestError";
  }
}

export class RuntimeError extends AgentWorktreeError {
  public constructor(message: string, causeValue?: unknown) {
    super("RUNTIME_ERROR", message, causeValue);
    this.name = "RuntimeError";
  }
}

export class NotImplementedError extends AgentWorktreeError {
  public constructor(message: string) {
    super("NOT_IMPLEMENTED", message);
    this.name = "NotImplementedError";
  }
}

export class NotFoundError extends AgentWorktreeError {
  public constructor(message: string) {
    super("NOT_FOUND", message);
    this.name = "NotFoundError";
  }
}

export class GitError extends AgentWorktreeError {
  public constructor(message: string, causeValue?: unknown) {
    super("GIT_ERROR", message, causeValue);
    this.name = "GitError";
  }
}

export class CleanupSafetyError extends ValidationError {
  public constructor(message: string, causeValue?: unknown) {
    super(message, causeValue);
    this.name = "CleanupSafetyError";
  }
}
