import { defaultManifestRoot } from "../core/paths.js";
import { listManifests } from "../manifest/store.js";
import type { AttemptManifest } from "../manifest/types.js";

export interface ListAttemptsOptions {
  manifestRoot?: string;
}

export async function listAttempts(
  options: ListAttemptsOptions = {}
): Promise<AttemptManifest[]> {
  return listManifests({
    rootDir: options.manifestRoot ?? defaultManifestRoot
  });
}
