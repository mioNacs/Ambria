import { beforeEach, describe, expect, test, vi } from "vitest";

import { createGitHubWriteConfirmation } from "@/lib/github-write-confirmation";

const reposGetMock = vi.fn();
const pullsGetMock = vi.fn();
const pullsUpdateMock = vi.fn();

vi.mock("@octokit/rest", () => {
  class Octokit {
    rest = {
      repos: {
        get: (...args: unknown[]) => reposGetMock(...args),
      },
      pulls: {
        get: (...args: unknown[]) => pullsGetMock(...args),
        update: (...args: unknown[]) => pullsUpdateMock(...args),
      },
    };

    constructor() {}
  }

  return { Octokit };
});

import { closePullRequest } from "@/services/github-repo";

describe("closePullRequest", () => {
  beforeEach(() => {
    reposGetMock.mockReset();
    pullsGetMock.mockReset();
    pullsUpdateMock.mockReset();
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
    ).rejects.toThrow(/Insufficient GitHub permissions/);
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
});
