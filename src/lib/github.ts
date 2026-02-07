/**
 * GitHub API utilities for repository operations
 */

export interface RepoDetails {
    owner: string;
    name: string;
    fullName: string;
    description: string | null;
    stars: number;
    language: string | null;
    url: string;
    defaultBranch: string;
    isPrivate: boolean;
}

export interface RepoPermissions {
    access: "read" | "write" | "admin";
    push: boolean;
    pull: boolean;
    admin: boolean;
}

/**
 * Parse a GitHub URL to extract owner and repo name
 * Supports formats:
 * - https://github.com/owner/repo
 * - github.com/owner/repo
 * - owner/repo
 */
export function parseGitHubUrl(input: string): { owner: string; repo: string } | null {
    // Remove trailing slashes and .git suffix
    const cleaned = input.trim().replace(/\/+$/, "").replace(/\.git$/, "");

    // Try full URL format
    const urlMatch = cleaned.match(
        /(?:https?:\/\/)?(?:www\.)?github\.com\/([^/]+)\/([^/]+)/i
    );
    if (urlMatch) {
        return { owner: urlMatch[1], repo: urlMatch[2] };
    }

    // Try owner/repo format
    const shortMatch = cleaned.match(/^([^/]+)\/([^/]+)$/);
    if (shortMatch) {
        return { owner: shortMatch[1], repo: shortMatch[2] };
    }

    return null;
}

export type ResolveGitHubRepoResult =
    | {
          ok: true;
          owner: string;
          repo: string;
      }
    | {
          ok: false;
          details: {
              formErrors: string[];
              fieldErrors: Record<string, string[]>;
          };
      };

/**
* Resolve a GitHub repo identifier from request fields.
*
* Precedence order (first valid source wins):
* 1) `repoUrl`
* 2) `fullName`
* 3) `repo` (when it looks like a URL or `owner/repo`)
* 4) `{ owner, repo }`
*/
export function resolveGitHubRepoFromRequest(input: {
    owner?: string;
    repo?: string;
    repoUrl?: string;
    fullName?: string;
}): ResolveGitHubRepoResult {
    const fieldErrors: Record<string, string[]> = {};

    function normalizeOptionalString(value: unknown): string | undefined {
        if (typeof value !== "string") return undefined;
        const trimmed = value.trim();
        return trimmed.length > 0 ? trimmed : undefined;
    }

    const repoUrl = normalizeOptionalString(input.repoUrl);
    const fullName = normalizeOptionalString(input.fullName);
    const owner = normalizeOptionalString(input.owner);
    const repo = normalizeOptionalString(input.repo);

    let resolved: { owner: string; repo: string } | null = null;

    if (repoUrl) {
        const parsed = parseGitHubUrl(repoUrl);
        if (!parsed) {
            fieldErrors.repoUrl = ["Could not parse GitHub repository."];
        } else {
            resolved = parsed;
        }
    }

    if (!resolved && fullName) {
        const parsed = parseGitHubUrl(fullName);
        if (!parsed) {
            fieldErrors.fullName = ["Could not parse GitHub repository."];
        } else {
            resolved = parsed;
        }
    }

    if (!resolved && repo && (repo.includes("/") || repo.includes("github.com"))) {
        const parsed = parseGitHubUrl(repo);
        if (!parsed) {
            fieldErrors.repo = ["Could not parse GitHub repository."];
        } else {
            resolved = parsed;
        }
    }

    if (!resolved && owner && repo) {
        resolved = {
            owner,
            repo,
        };
    }

    if (!resolved) {
        return {
            ok: false,
            details: {
                formErrors: [
                    "Provide { owner, repo } or a GitHub URL/full name via { repoUrl } or { fullName }.",
                ],
                fieldErrors,
            },
        };
    }

    return {
        ok: true,
        owner: resolved.owner.trim(),
        repo: resolved.repo.trim(),
    };
}

/**
 * Fetch repository details from GitHub API
 */
export async function getRepoDetails(
    owner: string,
    repo: string,
    token?: string
): Promise<RepoDetails> {
    const headers: HeadersInit = {
        Accept: "application/vnd.github.v3+json",
    };

    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(
        `https://api.github.com/repos/${owner}/${repo}`,
        { headers }
    );

    if (!response.ok) {
        if (response.status === 404) {
            throw new Error("Repository not found");
        }
        if (response.status === 403) {
            throw new Error("Rate limit exceeded or access denied");
        }
        throw new Error(`GitHub API error: ${response.status}`);
    }

    const data = await response.json();

    return {
        owner: data.owner.login,
        name: data.name,
        fullName: data.full_name,
        description: data.description,
        stars: data.stargazers_count,
        language: data.language,
        url: data.html_url,
        defaultBranch: data.default_branch,
        isPrivate: data.private,
    };
}

/**
 * Check user's permissions for a repository
 */
export async function checkRepoPermissions(
    owner: string,
    repo: string,
    token: string
): Promise<RepoPermissions> {
    const headers: HeadersInit = {
        Accept: "application/vnd.github.v3+json",
        Authorization: `Bearer ${token}`,
    };

    const response = await fetch(
        `https://api.github.com/repos/${owner}/${repo}`,
        { headers }
    );

    if (!response.ok) {
        if (response.status === 404) {
            throw new Error("Repository not found or no access");
        }
        throw new Error(`GitHub API error: ${response.status}`);
    }

    const data = await response.json();
    const permissions = data.permissions || {};

    // Determine access level
    let access: "read" | "write" | "admin" = "read";
    if (permissions.admin) {
        access = "admin";
    } else if (permissions.push) {
        access = "write";
    }

    return {
        access,
        push: permissions.push || false,
        pull: permissions.pull || false,
        admin: permissions.admin || false,
    };
}

/**
 * Get suggested role based on permissions
 */
export function getSuggestedRole(
    permissions: RepoPermissions
): "contributor" | "maintainer" | "both" {
    if (permissions.admin || permissions.push) {
        return "both";
    }
    return "contributor";
}
