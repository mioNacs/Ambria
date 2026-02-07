import { describe, expect, it, mock, vi } from "bun:test";
import { createGitHubWriteConfirmation } from "@/lib/github-write-confirmation";

const reposGet = vi.fn();
const issuesUpdate = vi.fn();

mock.module("@octokit/rest", () => {
  class Octokit {
    rest = {
      repos: {
        get: reposGet,
        listCollaborators: vi.fn(),
      },
      issues: {
        update: issuesUpdate,
      },
    };

    paginate = vi.fn();

    constructor() {}
  }

  return { Octokit };
});

const { getComponentsForRole, getToolsForRole } = await import("@/lib/tambo");
const { setIssueAssignees } = await import("@/services/github-repo");

describe("maintainer tool gating", () => {
  it("hides maintainer tools and components for contributor role", () => {
    const toolNames = getToolsForRole("contributor").map((t) => t.name);
    expect(toolNames).toContain("getRepoIssues");
    expect(toolNames).not.toContain("getRepoPullRequests");
    expect(toolNames).not.toContain("createRepoIssue");
    expect(toolNames).not.toContain("closeRepoIssue");

    const componentNames = getComponentsForRole("contributor").map(
      (c) => c.name,
    );
    expect(componentNames).toContain("IssueList");
    expect(componentNames).not.toContain("PullRequestList");
    expect(componentNames).not.toContain("GitHubCreateIssue");
    expect(componentNames).not.toContain("ConfirmCloseIssue");
  });

  it("includes maintainer tools and components for maintainer role", () => {
    const toolNames = getToolsForRole("maintainer").map((t) => t.name);
    expect(toolNames).toContain("getRepoIssues");
    expect(toolNames).toContain("getRepoPullRequests");
    expect(toolNames).toContain("createRepoIssue");
    expect(toolNames).toContain("setIssueAssignees");
    expect(toolNames).toContain("closeRepoIssue");
    expect(toolNames).toContain("getRepoMaintainers");

    const componentNames = getComponentsForRole("maintainer").map(
      (c) => c.name,
    );
    expect(componentNames).toContain("IssueList");
    expect(componentNames).toContain("PullRequestList");
    expect(componentNames).toContain("GitHubCreateIssue");
    expect(componentNames).toContain("ConfirmCloseIssue");
  });
});

describe("issue triage write tools", () => {
  it("setIssueAssignees applies updated assignees after confirmation", async () => {
    reposGet.mockResolvedValue({
      data: {
        permissions: {
          push: true,
          admin: false,
        },
      },
    });
    issuesUpdate.mockResolvedValue({
      data: {
        number: 42,
        state: "open",
        assignees: [{ login: "octocat" }],
        html_url: "https://github.com/o/r/issues/42",
      },
    });

    const confirmationId = createGitHubWriteConfirmation({
      owner: "o",
      repo: "r",
      kind: "issue_assignees",
    });

    const result = await setIssueAssignees({
      owner: "o",
      repo: "r",
      issueNumber: 42,
      assignees: ["octocat"],
      token: "token",
      confirmationId,
    });

    expect(reposGet).toHaveBeenCalledWith({ owner: "o", repo: "r" });
    expect(issuesUpdate).toHaveBeenCalledWith({
      owner: "o",
      repo: "r",
      issue_number: 42,
      assignees: ["octocat"],
    });

    expect(result).toEqual({
      issueNumber: 42,
      state: "open",
      assignees: ["octocat"],
      htmlUrl: "https://github.com/o/r/issues/42",
    });
  });
});
