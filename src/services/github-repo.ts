/**
 * @file github-repo.ts
 * @description GitHub repository tools for Tambo AI to access repo files and structure
 */

import { Octokit } from "@octokit/rest";

function toErrorMessage(error: unknown) {
    return error instanceof Error ? error.message : String(error);
}

function decodeBase64Utf8(base64: string) {
    const normalized = base64.replace(/\s/g, "");

    if (typeof Buffer !== "undefined") {
        return Buffer.from(normalized, "base64").toString("utf-8");
    }

    if (typeof globalThis.atob !== "function") {
        throw new Error("Base64 decoding is not supported in this environment");
    }

    const binary = globalThis.atob(normalized);
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    return new TextDecoder("utf-8").decode(bytes);
}

export interface RepoTreeItem {
    path: string;
    type: "file" | "dir";
    size?: number;
}

export interface RepoFileContent {
    path: string;
    content: string;
    size: number;
    encoding: string;
}

type GitTreeEntry = {
    path?: string | null;
    type?: string | null;
    size?: number | null;
};

/**
 * Get the file tree structure of a GitHub repository
 */
export async function getRepoTree(params: {
    owner: string;
    repo: string;
    path?: string;
    ref?: string;
    token?: string;
}): Promise<{ tree: RepoTreeItem[]; truncated: boolean }> {
    const { owner, repo, path = "", ref, token } = params;

    const normalizedPath = path.replace(/^\/+/, "").replace(/\/+$/, "");
    const pathPrefix = normalizedPath ? `${normalizedPath}/` : "";

    const octokit = new Octokit({
        auth: token,
    });

    try {
        // Use provided ref or get the default branch
        let treeSha = ref;
        if (!treeSha) {
            const { data: repoData } = await octokit.rest.repos.get({
                owner,
                repo,
            });
            treeSha = repoData.default_branch;
        }

        // Get the tree
        const { data: treeData } = await octokit.rest.git.getTree({
            owner,
            repo,
            tree_sha: treeSha,
            recursive: "true",
        });

        // Filter by path if provided
        let items = treeData.tree.filter((item: GitTreeEntry) => {
            if (!normalizedPath) return true;
            return item.path === normalizedPath || item.path?.startsWith(pathPrefix);
        });

        // Limit to 100 items to avoid overwhelming the AI
        const truncated = items.length > 100;
        items = items.slice(0, 100);

        const tree: RepoTreeItem[] = items.map((item: GitTreeEntry) => ({
            path: item.path || "",
            type: item.type === "tree" ? "dir" : "file",
            size: item.size ?? undefined,
        }));

        return { tree, truncated };
    } catch (error) {
        const message = toErrorMessage(error);
        console.error("Error fetching repo tree:", message);
        throw new Error(`Failed to fetch repository tree: ${message}`);
    }
}

/**
 * Get the content of a specific file from a GitHub repository
 */
export async function getFileContent(params: {
    owner: string;
    repo: string;
    path: string;
    ref?: string;
    token?: string;
}): Promise<RepoFileContent> {
    const { owner, repo, path, ref, token } = params;

    const octokit = new Octokit({
        auth: token,
    });

    try {
        const { data } = await octokit.rest.repos.getContent({
            owner,
            repo,
            path,
            ref,
        });

        if (Array.isArray(data)) {
            throw new Error("Path is a directory, not a file");
        }

        if (data.type !== "file") {
            throw new Error(`Path is not a file, it's a ${data.type}`);
        }

        // Decode base64 content
        const content = decodeBase64Utf8(data.content);

        // Truncate if too large
        const maxLength = 50000; // 50KB limit
        const truncatedContent =
            content.length > maxLength
                ? content.slice(0, maxLength) + "\n\n... [Content truncated]"
                : content;

        return {
            path: data.path,
            content: truncatedContent,
            size: data.size,
            encoding: "utf-8",
        };
    } catch (error) {
        const message = toErrorMessage(error);
        console.error("Error fetching file content:", message);
        throw new Error(`Failed to fetch file content: ${message}`);
    }
}

/**
 * Get multiple files content at once (useful for getting related files)
 */
export async function getMultipleFiles(params: {
    owner: string;
    repo: string;
    paths: string[];
    ref?: string;
    token?: string;
}): Promise<RepoFileContent[]> {
    const { owner, repo, paths, ref, token } = params;

    // Limit to 5 files to avoid overwhelming
    const limitedPaths = paths.slice(0, 5);

    const results: RepoFileContent[] = [];
    for (const path of limitedPaths) {
        try {
            const content = await getFileContent({ owner, repo, path, ref, token });
            results.push(content);
        } catch (error) {
            console.warn(`Failed to fetch ${path}:`, toErrorMessage(error));
        }
    }

    return results;
}

/**
 * Get README and other important files for quick context
 */
export async function getRepoOverview(params: {
    owner: string;
    repo: string;
    token?: string;
}): Promise<{
    readme?: RepoFileContent;
    packageJson?: RepoFileContent;
    structure: RepoTreeItem[];
}> {
    const { owner, repo, token } = params;

    // Get tree structure (top-level only)
    const { tree } = await getRepoTree({ owner, repo, token });

    // Get README if exists
    let readme: RepoFileContent | undefined;
    const readmePath = tree.find(
        (item) =>
            item.type === "file" &&
            item.path.toLowerCase().includes("readme")
    );
    if (readmePath) {
        try {
            readme = await getFileContent({
                owner,
                repo,
                path: readmePath.path,
                token,
            });
        } catch (e) {
            console.warn("Could not fetch README");
        }
    }

    // Get package.json if exists
    let packageJson: RepoFileContent | undefined;
    const pkgPath = tree.find(
        (item) => item.type === "file" && item.path === "package.json"
    );
    if (pkgPath) {
        try {
            packageJson = await getFileContent({
                owner,
                repo,
                path: "package.json",
                token,
            });
        } catch (e) {
            console.warn("Could not fetch package.json");
        }
    }

    // Return top-level structure only for overview
    const topLevelStructure = tree.filter(
        (item) => !item.path.includes("/") || item.path.split("/").length <= 2
    );

    return {
        readme,
        packageJson,
        structure: topLevelStructure.slice(0, 30),
    };
}

/**
 * Search for files by name pattern
 */
export async function searchFiles(params: {
    owner: string;
    repo: string;
    pattern: string;
    token?: string;
}): Promise<RepoTreeItem[]> {
    const { owner, repo, pattern, token } = params;

    const { tree } = await getRepoTree({ owner, repo, token });

    const lowerPattern = pattern.toLowerCase();
    const matches = tree.filter(
        (item) =>
            item.type === "file" &&
            item.path.toLowerCase().includes(lowerPattern)
    );

    return matches.slice(0, 20);
}

// ============================================
// REPOSITORY METADATA TOOLS
// ============================================

export interface RepoMetadata {
    name: string;
    fullName: string;
    description: string | null;
    owner: string;
    stars: number;
    forks: number;
    watchers: number;
    openIssues: number;
    topics: string[];
    license: string | null;
    language: string | null;
    defaultBranch: string;
    isPrivate: boolean;
    createdAt: string;
    updatedAt: string;
    pushedAt: string;
    homepage: string | null;
    archived: boolean;
    disabled: boolean;
}

/**
 * Get comprehensive metadata about a repository
 */
export async function getRepoMetadata(params: {
    owner: string;
    repo: string;
    token?: string;
}): Promise<RepoMetadata> {
    const { owner, repo, token } = params;
    const octokit = new Octokit({ auth: token });

    try {
        const { data } = await octokit.rest.repos.get({ owner, repo });

        return {
            name: data.name,
            fullName: data.full_name,
            description: data.description,
            owner: data.owner.login,
            stars: data.stargazers_count,
            forks: data.forks_count,
            watchers: data.watchers_count,
            openIssues: data.open_issues_count,
            topics: data.topics || [],
            license: data.license?.name || null,
            language: data.language,
            defaultBranch: data.default_branch,
            isPrivate: data.private,
            createdAt: data.created_at,
            updatedAt: data.updated_at,
            pushedAt: data.pushed_at || "",
            homepage: data.homepage || null,
            archived: data.archived,
            disabled: data.disabled,
        };
    } catch (error) {
        throw new Error(`Failed to fetch repository metadata: ${error}`);
    }
}

export interface Release {
    id: number;
    tagName: string;
    name: string | null;
    body: string | null;
    draft: boolean;
    prerelease: boolean;
    createdAt: string;
    publishedAt: string | null;
    author: string;
    htmlUrl: string;
}

/**
 * Get releases and tags from a repository
 */
export async function getRepoReleases(params: {
    owner: string;
    repo: string;
    limit?: number;
    token?: string;
}): Promise<Release[]> {
    const { owner, repo, limit = 10, token } = params;
    const octokit = new Octokit({ auth: token });

    try {
        const { data } = await octokit.rest.repos.listReleases({
            owner,
            repo,
            per_page: Math.min(limit, 30),
        });

        return data.map((release) => ({
            id: release.id,
            tagName: release.tag_name,
            name: release.name,
            body: release.body ? release.body.slice(0, 500) : null,
            draft: release.draft,
            prerelease: release.prerelease,
            createdAt: release.created_at,
            publishedAt: release.published_at,
            author: release.author.login,
            htmlUrl: release.html_url,
        }));
    } catch (error) {
        throw new Error(`Failed to fetch releases: ${error}`);
    }
}

export interface LanguageBreakdown {
    language: string;
    bytes: number;
    percentage: number;
}

/**
 * Get programming languages breakdown for a repository
 */
export async function getRepoLanguages(params: {
    owner: string;
    repo: string;
    token?: string;
}): Promise<LanguageBreakdown[]> {
    const { owner, repo, token } = params;
    const octokit = new Octokit({ auth: token });

    try {
        const { data } = await octokit.rest.repos.listLanguages({ owner, repo });
        const total = Object.values(data).reduce((sum, bytes) => sum + bytes, 0);

        return Object.entries(data).map(([language, bytes]) => ({
            language,
            bytes,
            percentage: Math.round((bytes / total) * 10000) / 100,
        }));
    } catch (error) {
        throw new Error(`Failed to fetch languages: ${error}`);
    }
}

export interface Contributor {
    login: string;
    avatarUrl: string;
    contributions: number;
    htmlUrl: string;
    type: string;
}

/**
 * Get top contributors for a repository
 */
export async function getRepoContributors(params: {
    owner: string;
    repo: string;
    limit?: number;
    token?: string;
}): Promise<Contributor[]> {
    const { owner, repo, limit = 20, token } = params;
    const octokit = new Octokit({ auth: token });

    try {
        const { data } = await octokit.rest.repos.listContributors({
            owner,
            repo,
            per_page: Math.min(limit, 50),
        });

        return data.map((contributor) => ({
            login: contributor.login || "unknown",
            avatarUrl: contributor.avatar_url || "",
            contributions: contributor.contributions,
            htmlUrl: contributor.html_url || "",
            type: contributor.type || "User",
        }));
    } catch (error) {
        throw new Error(`Failed to fetch contributors: ${error}`);
    }
}

// ============================================
// CODE & COMMITS TOOLS
// ============================================

export interface CommitInfo {
    sha: string;
    message: string;
    author: string;
    authorEmail: string;
    date: string;
    htmlUrl: string;
    stats?: {
        additions: number;
        deletions: number;
        total: number;
    };
}

/**
 * Get recent commits from a repository
 */
export async function getRepoCommits(params: {
    owner: string;
    repo: string;
    branch?: string;
    limit?: number;
    token?: string;
}): Promise<CommitInfo[]> {
    const { owner, repo, branch, limit = 20, token } = params;
    const octokit = new Octokit({ auth: token });

    try {
        const { data } = await octokit.rest.repos.listCommits({
            owner,
            repo,
            sha: branch,
            per_page: Math.min(limit, 50),
        });

        return data.map((commit) => ({
            sha: commit.sha,
            message: commit.commit.message.split("\n")[0],
            author: commit.commit.author?.name || "Unknown",
            authorEmail: commit.commit.author?.email || "",
            date: commit.commit.author?.date || "",
            htmlUrl: commit.html_url,
        }));
    } catch (error) {
        throw new Error(`Failed to fetch commits: ${error}`);
    }
}

export interface BranchInfo {
    name: string;
    sha: string;
    protected: boolean;
}

/**
 * Get all branches from a repository
 */
export async function getRepoBranches(params: {
    owner: string;
    repo: string;
    token?: string;
}): Promise<BranchInfo[]> {
    const { owner, repo, token } = params;
    const octokit = new Octokit({ auth: token });

    try {
        const { data } = await octokit.rest.repos.listBranches({
            owner,
            repo,
            per_page: 50,
        });

        return data.map((branch) => ({
            name: branch.name,
            sha: branch.commit.sha,
            protected: branch.protected,
        }));
    } catch (error) {
        throw new Error(`Failed to fetch branches: ${error}`);
    }
}

export interface BranchComparison {
    status: string;
    aheadBy: number;
    behindBy: number;
    totalCommits: number;
    commits: CommitInfo[];
    files: { filename: string; status: string; additions: number; deletions: number }[];
}

/**
 * Compare two branches or commits
 */
export async function compareBranches(params: {
    owner: string;
    repo: string;
    base: string;
    head: string;
    token?: string;
}): Promise<BranchComparison> {
    const { owner, repo, base, head, token } = params;
    const octokit = new Octokit({ auth: token });

    try {
        const { data } = await octokit.rest.repos.compareCommits({
            owner,
            repo,
            base,
            head,
        });

        return {
            status: data.status,
            aheadBy: data.ahead_by,
            behindBy: data.behind_by,
            totalCommits: data.total_commits,
            commits: data.commits.slice(0, 10).map((commit) => ({
                sha: commit.sha,
                message: commit.commit.message.split("\n")[0],
                author: commit.commit.author?.name || "Unknown",
                authorEmail: commit.commit.author?.email || "",
                date: commit.commit.author?.date || "",
                htmlUrl: commit.html_url,
            })),
            files: (data.files || []).slice(0, 20).map((file) => ({
                filename: file.filename,
                status: file.status,
                additions: file.additions,
                deletions: file.deletions,
            })),
        };
    } catch (error) {
        throw new Error(`Failed to compare branches: ${error}`);
    }
}

// ============================================
// ISSUES & PULL REQUESTS TOOLS
// ============================================

export interface Issue {
    number: number;
    title: string;
    state: string;
    author: string;
    labels: string[];
    createdAt: string;
    updatedAt: string;
    closedAt: string | null;
    comments: number;
    htmlUrl: string;
    body: string | null;
}

/**
 * Get issues from a repository
 */
export async function getRepoIssues(params: {
    owner: string;
    repo: string;
    state?: "open" | "closed" | "all";
    labels?: string;
    limit?: number;
    token?: string;
}): Promise<Issue[]> {
    const { owner, repo, state = "open", labels, limit = 20, token } = params;
    const octokit = new Octokit({ auth: token });

    try {
        const { data } = await octokit.rest.issues.listForRepo({
            owner,
            repo,
            state,
            labels,
            per_page: Math.min(limit, 50),
        });

        // Filter out pull requests (they appear in issues API)
        const issues = data.filter((item) => !item.pull_request);

        return issues.map((issue) => ({
            number: issue.number,
            title: issue.title,
            state: issue.state,
            author: issue.user?.login || "unknown",
            labels: issue.labels.map((l) => (typeof l === "string" ? l : l.name || "")),
            createdAt: issue.created_at,
            updatedAt: issue.updated_at,
            closedAt: issue.closed_at,
            comments: issue.comments,
            htmlUrl: issue.html_url,
            body: issue.body ? issue.body.slice(0, 500) : null,
        }));
    } catch (error) {
        throw new Error(`Failed to fetch issues: ${error}`);
    }
}

export interface IssueComment {
    id: number;
    author: string;
    body: string;
    createdAt: string;
    updatedAt: string;
    htmlUrl: string;
}

/**
 * Get comments on an issue
 */
export async function getIssueComments(params: {
    owner: string;
    repo: string;
    issueNumber: number;
    limit?: number;
    token?: string;
}): Promise<IssueComment[]> {
    const { owner, repo, issueNumber, limit = 20, token } = params;
    const octokit = new Octokit({ auth: token });

    try {
        const { data } = await octokit.rest.issues.listComments({
            owner,
            repo,
            issue_number: issueNumber,
            per_page: Math.min(limit, 50),
        });

        return data.map((comment) => ({
            id: comment.id,
            author: comment.user?.login || "unknown",
            body: comment.body ? comment.body.slice(0, 1000) : "",
            createdAt: comment.created_at,
            updatedAt: comment.updated_at,
            htmlUrl: comment.html_url,
        }));
    } catch (error) {
        throw new Error(`Failed to fetch issue comments: ${error}`);
    }
}

export interface PullRequest {
    number: number;
    title: string;
    state: string;
    author: string;
    labels: string[];
    createdAt: string;
    updatedAt: string;
    closedAt: string | null;
    mergedAt: string | null;
    draft: boolean;
    htmlUrl: string;
    body: string | null;
    head: string;
    base: string;
}

/**
 * Get pull requests from a repository
 */
export async function getRepoPullRequests(params: {
    owner: string;
    repo: string;
    state?: "open" | "closed" | "all";
    limit?: number;
    token?: string;
}): Promise<PullRequest[]> {
    const { owner, repo, state = "open", limit = 20, token } = params;
    const octokit = new Octokit({ auth: token });

    try {
        const { data } = await octokit.rest.pulls.list({
            owner,
            repo,
            state,
            per_page: Math.min(limit, 50),
        });

        return data.map((pr) => ({
            number: pr.number,
            title: pr.title,
            state: pr.state,
            author: pr.user?.login || "unknown",
            labels: pr.labels.map((l) => l.name || ""),
            createdAt: pr.created_at,
            updatedAt: pr.updated_at,
            closedAt: pr.closed_at,
            mergedAt: pr.merged_at,
            draft: pr.draft || false,
            htmlUrl: pr.html_url,
            body: pr.body ? pr.body.slice(0, 500) : null,
            head: pr.head.ref,
            base: pr.base.ref,
        }));
    } catch (error) {
        throw new Error(`Failed to fetch pull requests: ${error}`);
    }
}

export interface PRReview {
    id: number;
    author: string;
    state: string;
    body: string | null;
    submittedAt: string | null;
    htmlUrl: string;
}

/**
 * Get reviews for a pull request
 */
export async function getPRReviews(params: {
    owner: string;
    repo: string;
    pullNumber: number;
    token?: string;
}): Promise<PRReview[]> {
    const { owner, repo, pullNumber, token } = params;
    const octokit = new Octokit({ auth: token });

    try {
        const { data } = await octokit.rest.pulls.listReviews({
            owner,
            repo,
            pull_number: pullNumber,
        });

        return data.map((review) => ({
            id: review.id,
            author: review.user?.login || "unknown",
            state: review.state,
            body: review.body ? review.body.slice(0, 500) : null,
            submittedAt: review.submitted_at || null,
            htmlUrl: review.html_url,
        }));
    } catch (error) {
        throw new Error(`Failed to fetch PR reviews: ${error}`);
    }
}

// ============================================
// CI & PROJECT HEALTH TOOLS
// ============================================

export interface Workflow {
    id: number;
    name: string;
    path: string;
    state: string;
    createdAt: string;
    updatedAt: string;
    htmlUrl: string;
}

/**
 * Get GitHub Actions workflows
 */
export async function getRepoWorkflows(params: {
    owner: string;
    repo: string;
    token?: string;
}): Promise<Workflow[]> {
    const { owner, repo, token } = params;
    const octokit = new Octokit({ auth: token });

    try {
        const { data } = await octokit.rest.actions.listRepoWorkflows({
            owner,
            repo,
        });

        return data.workflows.map((workflow) => ({
            id: workflow.id,
            name: workflow.name,
            path: workflow.path,
            state: workflow.state,
            createdAt: workflow.created_at,
            updatedAt: workflow.updated_at,
            htmlUrl: workflow.html_url,
        }));
    } catch (error) {
        throw new Error(`Failed to fetch workflows: ${error}`);
    }
}

export interface WorkflowRun {
    id: number;
    name: string;
    status: string | null;
    conclusion: string | null;
    workflowId: number;
    branch: string | null;
    event: string;
    createdAt: string;
    updatedAt: string;
    htmlUrl: string;
    runNumber: number;
}

/**
 * Get recent workflow runs
 */
export async function getWorkflowRuns(params: {
    owner: string;
    repo: string;
    workflowId?: number;
    limit?: number;
    token?: string;
}): Promise<WorkflowRun[]> {
    const { owner, repo, workflowId, limit = 10, token } = params;
    const octokit = new Octokit({ auth: token });

    try {
        let data;
        if (workflowId) {
            const response = await octokit.rest.actions.listWorkflowRuns({
                owner,
                repo,
                workflow_id: workflowId,
                per_page: Math.min(limit, 30),
            });
            data = response.data;
        } else {
            const response = await octokit.rest.actions.listWorkflowRunsForRepo({
                owner,
                repo,
                per_page: Math.min(limit, 30),
            });
            data = response.data;
        }

        return data.workflow_runs.map((run) => ({
            id: run.id,
            name: run.name || "",
            status: run.status,
            conclusion: run.conclusion,
            workflowId: run.workflow_id,
            branch: run.head_branch,
            event: run.event,
            createdAt: run.created_at,
            updatedAt: run.updated_at,
            htmlUrl: run.html_url,
            runNumber: run.run_number,
        }));
    } catch (error) {
        throw new Error(`Failed to fetch workflow runs: ${error}`);
    }
}

export interface CommunityFile {
    name: string;
    path: string;
    exists: boolean;
    content?: string;
}

/**
 * Get community/health files from a repository
 */
export async function getCommunityFiles(params: {
    owner: string;
    repo: string;
    token?: string;
}): Promise<CommunityFile[]> {
    const { owner, repo, token } = params;
    const octokit = new Octokit({ auth: token });

    const checks: Array<{
        label: string;
        candidates: string[];
        preview?: boolean;
    }> = [
        {
            label: "CODE_OF_CONDUCT.md",
            candidates: ["CODE_OF_CONDUCT.md", ".github/CODE_OF_CONDUCT.md"],
            preview: true,
        },
        {
            label: "CONTRIBUTING.md",
            candidates: ["CONTRIBUTING.md", ".github/CONTRIBUTING.md"],
            preview: true,
        },
        {
            label: "CODEOWNERS",
            candidates: ["CODEOWNERS", ".github/CODEOWNERS"],
        },
        {
            label: "SECURITY.md",
            candidates: ["SECURITY.md"],
            preview: true,
        },
        {
            label: "FUNDING.yml",
            candidates: [".github/FUNDING.yml", "FUNDING.yml"],
        },
        {
            label: "ISSUE_TEMPLATE",
            candidates: [".github/ISSUE_TEMPLATE"],
        },
        {
            label: "PULL_REQUEST_TEMPLATE.md",
            candidates: [
                ".github/PULL_REQUEST_TEMPLATE.md",
                "PULL_REQUEST_TEMPLATE.md",
            ],
            preview: true,
        },
        {
            label: "LICENSE",
            candidates: ["LICENSE", "LICENSE.md", "LICENSE.txt"],
            preview: true,
        },
    ];

    const listDirectory = async (path: string) => {
        const { data } = path
            ? await octokit.rest.repos.getContent({ owner, repo, path })
            : await octokit.request("GET /repos/{owner}/{repo}/contents", {
                  owner,
                  repo,
              });
        if (!Array.isArray(data)) return new Map<string, { type: string; path: string }>();
        const entries = new Map<string, { type: string; path: string }>();
        for (const entry of data) {
            entries.set(entry.name, { type: entry.type, path: entry.path });
        }
        return entries;
    };

    const rootListing = await listDirectory("");

    const dirListings = new Map<string, Map<string, { type: string; path: string }>>();
    dirListings.set("", rootListing);

    const maybeAddListing = async (dirPath: string) => {
        if (dirListings.has(dirPath)) return;
        const parent = dirPath.split("/").slice(0, -1).join("/");
        const name = dirPath.split("/").pop() ?? "";
        const parentListing = dirListings.get(parent);
        const entry = parentListing?.get(name);
        if (!entry || entry.type !== "dir") return;
        dirListings.set(dirPath, await listDirectory(dirPath));
    };

    await maybeAddListing(".github");

    const results: CommunityFile[] = [];

    for (const check of checks) {
        let found: { candidate: string; type: string } | null = null;

        for (const candidate of check.candidates) {
            const parts = candidate.split("/").filter(Boolean);
            const parentDir = parts.slice(0, -1).join("/");
            const name = parts[parts.length - 1] ?? "";

            await maybeAddListing(parentDir);

            const listing = dirListings.get(parentDir);
            const entry = listing?.get(name);
            if (!entry) continue;

            found = { candidate, type: entry.type };
            break;
        }

        const outputPath = found?.candidate ?? check.candidates[0] ?? check.label;
        const outputName = outputPath.split("/").pop() || outputPath;

        if (!found) {
            results.push({
                name: outputName,
                path: outputPath,
                exists: false,
            });
            continue;
        }

        const file: CommunityFile = {
            name: outputName,
            path: outputPath,
            exists: true,
        };

        if (check.preview && found.type === "file") {
            try {
                const { data } = await octokit.rest.repos.getContent({
                    owner,
                    repo,
                    path: outputPath,
                });

                if (!Array.isArray(data) && data.type === "file") {
                    const decoded = decodeBase64Utf8(data.content);
                    file.content = decoded.slice(0, 1000);
                }
            } catch {
                // Ignore preview errors and still mark the file as present.
            }
        }

        results.push(file);
    }

    return results;
}

// ============================================
// PULL REQUEST DIFF TOOLS
// ============================================

export interface PRDiff {
    prNumber: number;
    title: string;
    state: string;
    additions: number;
    deletions: number;
    changedFiles: number;
    diff: string;
}

/**
 * Get the diff/patch for a pull request
 */
export async function getPullRequestDiff(params: {
    owner: string;
    repo: string;
    pullNumber: number;
    token?: string;
}): Promise<PRDiff> {
    const { owner, repo, pullNumber, token } = params;
    const octokit = new Octokit({ auth: token });

    try {
        // Get PR metadata
        const { data: pr } = await octokit.rest.pulls.get({
            owner,
            repo,
            pull_number: pullNumber,
        });

        // Get the diff
        const { data: diff } = await octokit.rest.pulls.get({
            owner,
            repo,
            pull_number: pullNumber,
            mediaType: {
                format: "diff",
            },
        });

        // Truncate diff if too large
        const maxLength = 100000;
        const diffStr = typeof diff === "string" ? diff : String(diff);
        const truncatedDiff =
            diffStr.length > maxLength
                ? diffStr.slice(0, maxLength) + "\n\n... [Diff truncated]"
                : diffStr;

        return {
            prNumber: pr.number,
            title: pr.title,
            state: pr.state,
            additions: pr.additions,
            deletions: pr.deletions,
            changedFiles: pr.changed_files,
            diff: truncatedDiff,
        };
    } catch (error) {
        throw new Error(`Failed to fetch PR diff: ${error}`);
    }
}

export interface PRFile {
    filename: string;
    status: string;
    additions: number;
    deletions: number;
    changes: number;
    patch?: string;
    previousFilename?: string;
}

/**
 * Get the list of files changed in a pull request with their patches
 */
export async function getPullRequestFiles(params: {
    owner: string;
    repo: string;
    pullNumber: number;
    token?: string;
}): Promise<PRFile[]> {
    const { owner, repo, pullNumber, token } = params;
    const octokit = new Octokit({ auth: token });

    try {
        const { data } = await octokit.rest.pulls.listFiles({
            owner,
            repo,
            pull_number: pullNumber,
            per_page: 100,
        });

        return data.map((file) => ({
            filename: file.filename,
            status: file.status,
            additions: file.additions,
            deletions: file.deletions,
            changes: file.changes,
            patch: file.patch ? file.patch.slice(0, 5000) : undefined,
            previousFilename: file.previous_filename,
        }));
    } catch (error) {
        throw new Error(`Failed to fetch PR files: ${error}`);
    }
}

/**
 * Get file content from a specific pull request's head branch
 */
export async function getPRFileContent(params: {
    owner: string;
    repo: string;
    pullNumber: number;
    path: string;
    token?: string;
}): Promise<RepoFileContent> {
    const { owner, repo, pullNumber, path, token } = params;
    const octokit = new Octokit({ auth: token });

    try {
        // Get the PR to find the head ref
        const { data: pr } = await octokit.rest.pulls.get({
            owner,
            repo,
            pull_number: pullNumber,
        });

        // Use the head SHA to get the file content
        return await getFileContent({
            owner,
            repo,
            path,
            ref: pr.head.sha,
            token,
        });
    } catch (error) {
        throw new Error(`Failed to fetch file from PR: ${error}`);
    }
}
