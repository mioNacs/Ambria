import { beforeEach, describe, expect, test, vi } from "vitest";

import { createGitHubWriteConfirmation } from "@/lib/github-write-confirmation";

const reposGetMock = vi.fn();
const reposCombinedStatusMock = vi.fn();
const pullsGetMock = vi.fn();
const pullsUpdateMock = vi.fn();
const pullsMergeMock = vi.fn();
const gitDeleteRefMock = vi.fn();

vi.mock("@octokit/rest", () => {
  class Octokit {
    rest = {
      repos: {
        get: (...args: unknown[]) => reposGetMock(...args),
        getCombinedStatusForRef: (...args: unknown[]) =>
          reposCombinedStatusMock(...args),
      },
      pulls: {
        get: (...args: unknown[]) => pullsGetMock(...args),
        update: (...args: unknown[]) => pullsUpdateMock(...args),
        merge: (...args: unknown[]) => pullsMergeMock(...args),
      },
      git: {
        deleteRef: (...args: unknown[]) => gitDeleteRefMock(...args),
      },
    };

    constructor() {}
  }

  return { Octokit };
});

import { closePullRequest, mergePullRequest } from "@/services/github-repo";

describe("closePullRequest", () => {
  beforeEach(() => {
    reposGetMock.mockReset();
    reposCombinedStatusMock.mockReset();
    pullsGetMock.mockReset();
    pullsUpdateMock.mockReset();
    pullsMergeMock.mockReset();
    gitDeleteRefMock.mockReset();
  });

  test("rejects when token lacks write permissions", async () => {
    reposGetMock.mockResolvedValue({
      data: { permissions: { admin: false, push: false, pull: true } },
    });

    const confirmationId = createGitHubWriteConfirmation({
      owner: "acme",
      repo: "repo",
      kind: "pull_request_close",
    });

    await expect(
      closePullRequest({
        owner: "acme",
        repo: "repo",
        pullNumber: 1,
        token: "token",
        confirmationId,
      }),
    ).rejects.toThrow(/Write access required/);
  });

  test("closes an open pull request", async () => {
    reposGetMock.mockResolvedValue({
      data: { permissions: { admin: false, push: true, pull: true } },
    });
    pullsGetMock.mockResolvedValue({ data: { state: "open" } });
    pullsUpdateMock.mockResolvedValue({
      data: {
        number: 1,
        state: "closed",
        html_url: "https://github.com/acme/repo/pull/1",
      },
    });

    const confirmationId = createGitHubWriteConfirmation({
      owner: "acme",
      repo: "repo",
      kind: "pull_request_close",
    });

    const closed = await closePullRequest({
      owner: "acme",
      repo: "repo",
      pullNumber: 1,
      token: "token",
      confirmationId,
    });

    expect(pullsUpdateMock).toHaveBeenCalledWith({
      owner: "acme",
      repo: "repo",
      pull_number: 1,
      state: "closed",
    });
    expect(closed.state).toBe("closed");
  });

  test("allows maintain permission", async () => {
    reposGetMock.mockResolvedValue({
      data: {
        permissions: { admin: false, maintain: true, push: false, pull: true },
      },
    });
    pullsGetMock.mockResolvedValue({ data: { state: "open" } });
    pullsUpdateMock.mockResolvedValue({
      data: {
        number: 2,
        state: "closed",
        html_url: "https://github.com/acme/repo/pull/2",
      },
    });

    const confirmationId = createGitHubWriteConfirmation({
      owner: "acme",
      repo: "repo",
      kind: "pull_request_close",
    });

    const closed = await closePullRequest({
      owner: "acme",
      repo: "repo",
      pullNumber: 2,
      token: "token",
      confirmationId,
    });

    expect(closed.state).toBe("closed");
  });
});

describe("mergePullRequest", () => {
  beforeEach(() => {
    reposGetMock.mockReset();
    reposCombinedStatusMock.mockReset();
    pullsGetMock.mockReset();
    pullsUpdateMock.mockReset();
    pullsMergeMock.mockReset();
    gitDeleteRefMock.mockReset();
  });

  test("rejects merge conflicts", async () => {
    reposGetMock.mockResolvedValue({
      data: { permissions: { admin: false, push: true, pull: true } },
    });
    pullsGetMock.mockResolvedValue({
      data: {
        number: 1,
        title: "Test PR",
        state: "open",
        mergeable: false,
        mergeable_state: "dirty",
        html_url: "https://github.com/acme/repo/pull/1",
        head: {
          sha: "deadbeef",
          ref: "feature",
          repo: { full_name: "acme/repo" },
        },
        base: {
          ref: "main",
          repo: { full_name: "acme/repo" },
        },
      },
    });

    const confirmationId = createGitHubWriteConfirmation({
      owner: "acme",
      repo: "repo",
      kind: "pull_request_merge",
    });

    await expect(
      mergePullRequest({
        owner: "acme",
        repo: "repo",
        pullNumber: 1,
        token: "token",
        confirmationId,
      }),
    ).rejects.toThrow(/merge conflicts/i);
  });

  test("rejects failing checks", async () => {
    reposGetMock.mockResolvedValue({
      data: { permissions: { admin: false, push: true, pull: true } },
    });
    pullsGetMock.mockResolvedValue({
      data: {
        number: 1,
        title: "Test PR",
        state: "open",
        mergeable: true,
        mergeable_state: "clean",
        html_url: "https://github.com/acme/repo/pull/1",
        head: {
          sha: "deadbeef",
          ref: "feature",
          repo: { full_name: "acme/repo" },
        },
        base: {
          ref: "main",
          repo: { full_name: "acme/repo" },
        },
      },
    });
    reposCombinedStatusMock.mockResolvedValue({
      data: {
        state: "failure",
        total_count: 1,
        statuses: [{ state: "failure" }],
      },
    });

    const confirmationId = createGitHubWriteConfirmation({
      owner: "acme",
      repo: "repo",
      kind: "pull_request_merge",
    });

    await expect(
      mergePullRequest({
        owner: "acme",
        repo: "repo",
        pullNumber: 1,
        token: "token",
        confirmationId,
      }),
    ).rejects.toThrow(/checks are failing/i);
    expect(pullsMergeMock).not.toHaveBeenCalled();
  });

  test("merges with selected method and deletes branch when requested", async () => {
    reposGetMock.mockResolvedValue({
      data: { permissions: { admin: false, push: true, pull: true } },
    });
    pullsGetMock.mockResolvedValue({
      data: {
        number: 1,
        title: "Test PR",
        state: "open",
        mergeable: true,
        mergeable_state: "clean",
        html_url: "https://github.com/acme/repo/pull/1",
        head: {
          sha: "deadbeef",
          ref: "feature",
          repo: { full_name: "acme/repo" },
        },
        base: {
          ref: "main",
          repo: { full_name: "acme/repo" },
        },
      },
    });
    reposCombinedStatusMock.mockResolvedValue({
      data: {
        state: "success",
        total_count: 0,
        statuses: [],
      },
    });
    pullsMergeMock.mockResolvedValue({
      data: { merged: true, message: "Merged", sha: "cafebabe" },
    });
    gitDeleteRefMock.mockResolvedValue({});

    const confirmationId = createGitHubWriteConfirmation({
      owner: "acme",
      repo: "repo",
      kind: "pull_request_merge",
    });

    const merged = await mergePullRequest({
      owner: "acme",
      repo: "repo",
      pullNumber: 1,
      mergeMethod: "squash",
      deleteBranch: true,
      token: "token",
      confirmationId,
    });

    expect(pullsMergeMock).toHaveBeenCalledWith({
      owner: "acme",
      repo: "repo",
      pull_number: 1,
      merge_method: "squash",
    });
    expect(gitDeleteRefMock).toHaveBeenCalledWith({
      owner: "acme",
      repo: "repo",
      ref: "heads/feature",
    });
    expect(merged.branchDeleted).toBe(true);
  });
});
