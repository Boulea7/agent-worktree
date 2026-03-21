const maxHandleLength = 48;

export interface AttemptNamingInput {
  attemptId: string;
  taskId: string;
}

export function buildAttemptHandle(taskId: string): string {
  const normalized = taskId
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

  if (normalized.length === 0) {
    return "task";
  }

  return normalized.slice(0, maxHandleLength).replace(/-+$/g, "") || "task";
}

export function slugifySegment(value: string): string {
  return buildAttemptHandle(value);
}

function normalizeAttemptSuffix(attemptId: string): string {
  const cleaned = attemptId.replace(/^att_/, "").replace(/[^a-zA-Z0-9]+/g, "");
  return cleaned.slice(-8).toLowerCase() || "00000000";
}

export function createAttemptHandle(taskId: string, attemptId: string): string {
  return `${buildAttemptHandle(taskId)}-${normalizeAttemptSuffix(attemptId)}`;
}

export function buildAttemptBranch(input: AttemptNamingInput): string {
  return `attempt/${buildAttemptHandle(input.taskId)}/${input.attemptId}`;
}

export function createAttemptBranchName(handle: string): string {
  return `attempt/${handle}`;
}

export function buildWorktreeDirectoryName(input: AttemptNamingInput): string {
  return `${buildAttemptHandle(input.taskId)}-${input.attemptId}`;
}
