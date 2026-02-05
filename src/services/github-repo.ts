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
    token?: string;
}): Promise<{ tree: RepoTreeItem[]; truncated: boolean }> {
    const { owner, repo, path = "", token } = params;

    const normalizedPath = path.replace(/^\/+/, "").replace(/\/+$/, "");
    const pathPrefix = normalizedPath ? `${normalizedPath}/` : "";

    const octokit = new Octokit({
        auth: token,
    });

    try {
        // Get the default branch
        const { data: repoData } = await octokit.rest.repos.get({
            owner,
            repo,
        });

        const branch = repoData.default_branch;

        // Get the tree
        const { data: treeData } = await octokit.rest.git.getTree({
            owner,
            repo,
            tree_sha: branch,
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
    token?: string;
}): Promise<RepoFileContent> {
    const { owner, repo, path, token } = params;

    const octokit = new Octokit({
        auth: token,
    });

    try {
        const { data } = await octokit.rest.repos.getContent({
            owner,
            repo,
            path,
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
    token?: string;
}): Promise<RepoFileContent[]> {
    const { owner, repo, paths, token } = params;

    // Limit to 5 files to avoid overwhelming
    const limitedPaths = paths.slice(0, 5);

    const results: RepoFileContent[] = [];
    for (const path of limitedPaths) {
        try {
            const content = await getFileContent({ owner, repo, path, token });
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
