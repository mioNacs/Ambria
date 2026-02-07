import { beforeEach, describe, expect, it, vi } from "vitest";

import { createGitHubWriteConfirmation } from "@/lib/github-write-confirmation";

const reposGet = vi.fn();
const issuesUpdate = vi.fn();

if (!("Worker" in globalThis)) {
  vi.stubGlobal(
    "Worker",
    class Worker {
      constructor() {}
      postMessage() {}
      terminate() {}
      addEventListener() {}
      removeEventListener() {}
    },
  );
}

vi.mock("@octokit/rest", () => {
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

const { components, tools, getComponentsForRole, getToolsForRole } = await import(
  "@/lib/tambo",
);
const { setIssueAssignees } = await import("@/services/github-repo");

describe("maintainer tool gating", () => {
  beforeEach(() => {
    reposGet.mockReset();
    issuesUpdate.mockReset();
  });

  it("does not accidentally orphan tools/components outside role allowlists", () => {
    const visibleToolNames = new Set([
      ...getToolsForRole("contributor").map((t) => t.name),
      ...getToolsForRole("maintainer").map((t) => t.name),
    ]);
    for (const tool of tools) {
      expect(visibleToolNames.has(tool.name)).toBe(true);
    }

    const visibleComponentNames = new Set([
      ...getComponentsForRole("contributor").map((c) => c.name),
      ...getComponentsForRole("maintainer").map((c) => c.name),
    ]);
    for (const component of components) {
      expect(visibleComponentNames.has(component.name)).toBe(true);
    }
  });

  it("hides maintainer tools and components for contributor role", () => {
    const toolNames = getToolsForRole("contributor").map((t) => t.name);
    expect(toolNames).toContain("getRepoIssues");
    expect(toolNames).not.toContain("getRepoPullRequests");
    expect(toolNames).not.toContain("createRepoIssue");
    expect(toolNames).not.toContain("setIssueAssignees");
    expect(toolNames).not.toContain("closeRepoIssue");
    expect(toolNames).not.toContain("getRepoMaintainers");
    expect(toolNames).not.toContain("mergePullRequest");
    expect(toolNames).not.toContain("closePullRequest");

    const componentNames = getComponentsForRole("contributor").map(
      (c) => c.name,
    );
    expect(componentNames).toContain("IssueList");
    expect(componentNames).not.toContain("PullRequestList");
    expect(componentNames).not.toContain("GitHubCreateIssue");
    expect(componentNames).not.toContain("ConfirmAssignIssue");
    expect(componentNames).not.toContain("ConfirmCloseIssue");
    expect(componentNames).not.toContain("ConfirmMergePR");
    expect(componentNames).not.toContain("ConfirmClosePR");
  });

  it("includes maintainer tools and components for maintainer role", () => {
    const toolNames = getToolsForRole("maintainer").map((t) => t.name);
    expect(toolNames).toContain("getRepoIssues");
    expect(toolNames).toContain("getRepoPullRequests");
    expect(toolNames).toContain("createRepoIssue");
    expect(toolNames).toContain("setIssueAssignees");
    expect(toolNames).toContain("closeRepoIssue");
    expect(toolNames).toContain("getRepoMaintainers");
    expect(toolNames).toContain("mergePullRequest");
    expect(toolNames).toContain("closePullRequest");

    const componentNames = getComponentsForRole("maintainer").map(
      (c) => c.name,
    );
    expect(componentNames).toContain("IssueList");
    expect(componentNames).toContain("PullRequestList");
    expect(componentNames).toContain("GitHubCreateIssue");
    expect(componentNames).toContain("ConfirmCloseIssue");
    expect(componentNames).toContain("ConfirmMergePR");
    expect(componentNames).toContain("ConfirmClosePR");
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
