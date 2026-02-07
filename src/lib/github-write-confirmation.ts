export type GitHubWriteKind =
  | "issue"
  | "pull_request"
  | "comment"
  | "issue_assignees"
  | "issue_close"
  | "issue_reopen"
  | "pull_request_merge"
  | "pull_request_close"
  | "pull_request_reopen";

type ConfirmationStore =
  Map<string, { expiresAt: number; owner: string; repo: string; kind: GitHubWriteKind }>;

const STORE_KEY = "__tambo_github_write_confirmations";
const DEFAULT_TTL_MS = 2 * 60 * 1000;

function getStore(): ConfirmationStore {
  const g = globalThis as unknown as Record<string, unknown>;
  const existing = g[STORE_KEY];

  if (existing instanceof Map) {
    return existing as ConfirmationStore;
  }

  const created: ConfirmationStore = new Map();
  g[STORE_KEY] = created;
  return created;
}

function sweepExpired(store: ConfirmationStore, now = Date.now()) {
  for (const [key, value] of store.entries()) {
    if (value.expiresAt <= now) {
      store.delete(key);
    }
  }
}

function createId() {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/**
* Creates a short-lived confirmation token for GitHub write actions.
*
* This is meant to be generated only by a user click in the UI.
*/
export function createGitHubWriteConfirmation(params: {
  owner: string;
  repo: string;
  kind: GitHubWriteKind;
  ttlMs?: number;
}): string {
  const store = getStore();
  const now = Date.now();
  sweepExpired(store, now);

  const id = createId();
  store.set(id, {
    expiresAt: now + (params.ttlMs ?? DEFAULT_TTL_MS),
    owner: params.owner,
    repo: params.repo,
    kind: params.kind,
  });
  return id;
}

export function hasGitHubWriteConfirmation(params: {
  id: string;
  owner: string;
  repo: string;
  kind: GitHubWriteKind;
}): boolean {
  const store = getStore();
  const now = Date.now();
  sweepExpired(store, now);

  const value = store.get(params.id);
  return (
    !!value &&
    value.expiresAt > now &&
    value.owner === params.owner &&
    value.repo === params.repo &&
    value.kind === params.kind
  );
}

export function consumeGitHubWriteConfirmation(params: {
  id: string;
  owner: string;
  repo: string;
  kind: GitHubWriteKind;
}): void {
  if (!hasGitHubWriteConfirmation(params)) {
    return;
  }

  getStore().delete(params.id);
}
