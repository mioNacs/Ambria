/**
 * @file tambo.ts
 * @description Central configuration file for Tambo components and tools
 *
 * This file serves as the central place to register your Tambo components and tools.
 * It exports arrays that will be used by the TamboProvider.
 *
 * Read more about Tambo at https://tambo.co/docs
 */

import { Graph, graphSchema } from "@/components/tambo/graph";
import { DataCard, dataCardSchema } from "@/components/ui/card-data";
import {
  getCountryPopulations,
  getGlobalPopulationTrend,
} from "@/services/population-stats";
import {
  getRepoTree,
  getFileContent,
  getRepoOverview,
  searchFiles,
  getMultipleFiles,
  // New metadata tools
  getRepoMetadata,
  getRepoReleases,
  getRepoLanguages,
  getRepoContributors,
  // Commits & branches tools
  getRepoCommits,
  getRepoBranches,
  compareBranches,
  // Issues & PRs tools
  getRepoIssues,
  getIssueComments,
  getRepoPullRequests,
  getPRReviews,
  // CI & project health tools
  getRepoWorkflows,
  getWorkflowRuns,
  getCommunityFiles,
  // PR diff tools
  getPullRequestDiff,
  getPullRequestFiles,
  getPRFileContent,
} from "@/services/github-repo";
import type { TamboComponent, TamboTool } from "@tambo-ai/react";
import { z } from "zod";

/**
 * tools
 *
 * This array contains all the Tambo tools that are registered for use within the application.
 * Each tool is defined with its name, description, and expected props. The tools
 * can be controlled by AI to dynamically fetch data based on user interactions.
 */

export const tools: TamboTool[] = [
  // GitHub Repository Tools
  {
    name: "getRepoTree",
    description:
      "Get the file tree structure of a GitHub repository. Use this to understand what files and folders exist in the project. Supports reading from specific branches or commits using the ref parameter.",
    tool: getRepoTree,
    inputSchema: z.object({
      owner: z.string().describe("GitHub repository owner/organization name"),
      repo: z.string().describe("GitHub repository name"),
      path: z.string().optional().describe("Optional path to filter the tree (e.g., 'src' to only show files in src folder)"),
      ref: z.string().optional().describe("Branch name, tag, or commit SHA to read from (defaults to default branch)"),
      token: z.string().optional().describe("GitHub access token for private repos"),
    }),
    outputSchema: z.object({
      tree: z.array(
        z.object({
          path: z.string(),
          type: z.enum(["file", "dir"]),
          size: z.number().optional(),
        })
      ),
      truncated: z.boolean(),
    }),
  },
  {
    name: "getFileContent",
    description:
      "Get the content of a specific file from a GitHub repository. Supports reading from specific branches or commits using the ref parameter.",
    tool: getFileContent,
    inputSchema: z.object({
      owner: z.string().describe("GitHub repository owner/organization name"),
      repo: z.string().describe("GitHub repository name"),
      path: z.string().describe("Full path to the file (e.g., 'src/index.ts' or 'README.md')"),
      ref: z.string().optional().describe("Branch name, tag, or commit SHA to read from (defaults to default branch)"),
      token: z.string().optional().describe("GitHub access token for private repos"),
    }),
    outputSchema: z.object({
      path: z.string(),
      content: z.string(),
      size: z.number(),
      encoding: z.string(),
    }),
  },
  {
    name: "getRepoOverview",
    description:
      "Get a quick overview of the repository including README, package.json (if present), and top-level folder structure. Use this first to understand the project before diving into specific files.",
    tool: getRepoOverview,
    inputSchema: z.object({
      owner: z.string().describe("GitHub repository owner/organization name"),
      repo: z.string().describe("GitHub repository name"),
      token: z.string().optional().describe("GitHub access token for private repos"),
    }),
    outputSchema: z.object({
      readme: z.object({
        path: z.string(),
        content: z.string(),
        size: z.number(),
        encoding: z.string(),
      }).optional(),
      packageJson: z.object({
        path: z.string(),
        content: z.string(),
        size: z.number(),
        encoding: z.string(),
      }).optional(),
      structure: z.array(
        z.object({
          path: z.string(),
          type: z.enum(["file", "dir"]),
          size: z.number().optional(),
        })
      ),
    }),
  },
  {
    name: "searchFiles",
    description:
      "Search for files in the repository by name pattern. Use this to find specific files like test files, configuration files, or files containing certain keywords in their names.",
    tool: searchFiles,
    inputSchema: z.object({
      owner: z.string().describe("GitHub repository owner/organization name"),
      repo: z.string().describe("GitHub repository name"),
      pattern: z.string().describe("Pattern to search for in file names (e.g., 'test', '.config', 'util')"),
      token: z.string().optional().describe("GitHub access token for private repos"),
    }),
    outputSchema: z.array(
      z.object({
        path: z.string(),
        type: z.enum(["file", "dir"]),
        size: z.number().optional(),
      })
    ),
  },
  {
    name: "getMultipleFiles",
    description:
      "Get the content of multiple files at once. Supports reading from specific branches or commits using the ref parameter. Limited to 5 files maximum.",
    tool: getMultipleFiles,
    inputSchema: z.object({
      owner: z.string().describe("GitHub repository owner/organization name"),
      repo: z.string().describe("GitHub repository name"),
      paths: z.array(z.string()).describe("Array of file paths to fetch (max 5)"),
      ref: z.string().optional().describe("Branch name, tag, or commit SHA to read from (defaults to default branch)"),
      token: z.string().optional().describe("GitHub access token for private repos"),
    }),
    outputSchema: z.array(
      z.object({
        path: z.string(),
        content: z.string(),
        size: z.number(),
        encoding: z.string(),
      })
    ),
  },

  // ============================================
  // NEW GITHUB API TOOLS
  // ============================================

  // Repository Metadata Tools
  {
    name: "getRepoMetadata",
    description:
      "Get comprehensive metadata about a GitHub repository including stars, forks, watchers, topics, license, and more.",
    tool: getRepoMetadata,
    inputSchema: z.object({
      owner: z.string().describe("GitHub repository owner/organization name"),
      repo: z.string().describe("GitHub repository name"),
      token: z.string().optional().describe("GitHub access token for private repos"),
    }),
    outputSchema: z.object({
      name: z.string(),
      fullName: z.string(),
      description: z.string().nullable(),
      owner: z.string(),
      stars: z.number(),
      forks: z.number(),
      watchers: z.number(),
      openIssues: z.number(),
      topics: z.array(z.string()),
      license: z.string().nullable(),
      language: z.string().nullable(),
      defaultBranch: z.string(),
      isPrivate: z.boolean(),
      createdAt: z.string(),
      updatedAt: z.string(),
      pushedAt: z.string(),
      homepage: z.string().nullable(),
      archived: z.boolean(),
      disabled: z.boolean(),
    }),
  },
  {
    name: "getRepoReleases",
    description:
      "Get releases and tags from a repository. Useful for understanding version history and release notes.",
    tool: getRepoReleases,
    inputSchema: z.object({
      owner: z.string().describe("GitHub repository owner/organization name"),
      repo: z.string().describe("GitHub repository name"),
      limit: z.number().optional().describe("Number of releases to fetch (default 10, max 30)"),
      token: z.string().optional().describe("GitHub access token for private repos"),
    }),
    outputSchema: z.array(
      z.object({
        id: z.number(),
        tagName: z.string(),
        name: z.string().nullable(),
        body: z.string().nullable(),
        draft: z.boolean(),
        prerelease: z.boolean(),
        createdAt: z.string(),
        publishedAt: z.string().nullable(),
        author: z.string(),
        htmlUrl: z.string(),
      })
    ),
  },
  {
    name: "getRepoLanguages",
    description:
      "Get programming languages breakdown for a repository with byte counts and percentages.",
    tool: getRepoLanguages,
    inputSchema: z.object({
      owner: z.string().describe("GitHub repository owner/organization name"),
      repo: z.string().describe("GitHub repository name"),
      token: z.string().optional().describe("GitHub access token for private repos"),
    }),
    outputSchema: z.array(
      z.object({
        language: z.string(),
        bytes: z.number(),
        percentage: z.number(),
      })
    ),
  },
  {
    name: "getRepoContributors",
    description:
      "Get top contributors for a repository with their contribution counts.",
    tool: getRepoContributors,
    inputSchema: z.object({
      owner: z.string().describe("GitHub repository owner/organization name"),
      repo: z.string().describe("GitHub repository name"),
      limit: z.number().optional().describe("Number of contributors to fetch (default 20, max 50)"),
      token: z.string().optional().describe("GitHub access token for private repos"),
    }),
    outputSchema: z.array(
      z.object({
        login: z.string(),
        avatarUrl: z.string(),
        contributions: z.number(),
        htmlUrl: z.string(),
        type: z.string(),
      })
    ),
  },

  // Commits & Branches Tools
  {
    name: "getRepoCommits",
    description:
      "Get recent commits from a repository. Can filter by branch.",
    tool: getRepoCommits,
    inputSchema: z.object({
      owner: z.string().describe("GitHub repository owner/organization name"),
      repo: z.string().describe("GitHub repository name"),
      branch: z.string().optional().describe("Branch name to get commits from"),
      limit: z.number().optional().describe("Number of commits to fetch (default 20, max 50)"),
      token: z.string().optional().describe("GitHub access token for private repos"),
    }),
    outputSchema: z.array(
      z.object({
        sha: z.string(),
        message: z.string(),
        author: z.string(),
        authorEmail: z.string(),
        date: z.string(),
        htmlUrl: z.string(),
      })
    ),
  },
  {
    name: "getRepoBranches",
    description:
      "Get all branches from a repository with their protection status.",
    tool: getRepoBranches,
    inputSchema: z.object({
      owner: z.string().describe("GitHub repository owner/organization name"),
      repo: z.string().describe("GitHub repository name"),
      token: z.string().optional().describe("GitHub access token for private repos"),
    }),
    outputSchema: z.array(
      z.object({
        name: z.string(),
        sha: z.string(),
        protected: z.boolean(),
      })
    ),
  },
  {
    name: "compareBranches",
    description:
      "Compare two branches or commits to see differences, commits ahead/behind, and changed files.",
    tool: compareBranches,
    inputSchema: z.object({
      owner: z.string().describe("GitHub repository owner/organization name"),
      repo: z.string().describe("GitHub repository name"),
      base: z.string().describe("Base branch or commit SHA"),
      head: z.string().describe("Head branch or commit SHA to compare"),
      token: z.string().optional().describe("GitHub access token for private repos"),
    }),
    outputSchema: z.object({
      status: z.string(),
      aheadBy: z.number(),
      behindBy: z.number(),
      totalCommits: z.number(),
      commits: z.array(
        z.object({
          sha: z.string(),
          message: z.string(),
          author: z.string(),
          authorEmail: z.string(),
          date: z.string(),
          htmlUrl: z.string(),
        })
      ),
      files: z.array(
        z.object({
          filename: z.string(),
          status: z.string(),
          additions: z.number(),
          deletions: z.number(),
        })
      ),
    }),
  },

  // Issues & Pull Requests Tools
  {
    name: "getRepoIssues",
    description:
      "Get issues from a repository with filters for state and labels.",
    tool: getRepoIssues,
    inputSchema: z.object({
      owner: z.string().describe("GitHub repository owner/organization name"),
      repo: z.string().describe("GitHub repository name"),
      state: z.enum(["open", "closed", "all"]).optional().describe("Issue state filter"),
      labels: z.string().optional().describe("Comma-separated list of label names"),
      limit: z.number().optional().describe("Number of issues to fetch (default 20, max 50)"),
      token: z.string().optional().describe("GitHub access token for private repos"),
    }),
    outputSchema: z.array(
      z.object({
        number: z.number(),
        title: z.string(),
        state: z.string(),
        author: z.string(),
        labels: z.array(z.string()),
        createdAt: z.string(),
        updatedAt: z.string(),
        closedAt: z.string().nullable(),
        comments: z.number(),
        htmlUrl: z.string(),
        body: z.string().nullable(),
      })
    ),
  },
  {
    name: "getIssueComments",
    description:
      "Get comments on an issue or pull request.",
    tool: getIssueComments,
    inputSchema: z.object({
      owner: z.string().describe("GitHub repository owner/organization name"),
      repo: z.string().describe("GitHub repository name"),
      issueNumber: z.number().describe("Issue or PR number"),
      limit: z.number().optional().describe("Number of comments to fetch (default 20, max 50)"),
      token: z.string().optional().describe("GitHub access token for private repos"),
    }),
    outputSchema: z.array(
      z.object({
        id: z.number(),
        author: z.string(),
        body: z.string(),
        createdAt: z.string(),
        updatedAt: z.string(),
        htmlUrl: z.string(),
      })
    ),
  },
  {
    name: "getRepoPullRequests",
    description:
      "Get pull requests from a repository with state filter.",
    tool: getRepoPullRequests,
    inputSchema: z.object({
      owner: z.string().describe("GitHub repository owner/organization name"),
      repo: z.string().describe("GitHub repository name"),
      state: z.enum(["open", "closed", "all"]).optional().describe("PR state filter"),
      limit: z.number().optional().describe("Number of PRs to fetch (default 20, max 50)"),
      token: z.string().optional().describe("GitHub access token for private repos"),
    }),
    outputSchema: z.array(
      z.object({
        number: z.number(),
        title: z.string(),
        state: z.string(),
        author: z.string(),
        labels: z.array(z.string()),
        createdAt: z.string(),
        updatedAt: z.string(),
        closedAt: z.string().nullable(),
        mergedAt: z.string().nullable(),
        draft: z.boolean(),
        htmlUrl: z.string(),
        body: z.string().nullable(),
        head: z.string(),
        base: z.string(),
      })
    ),
  },
  {
    name: "getPRReviews",
    description:
      "Get reviews for a pull request including approval status and comments.",
    tool: getPRReviews,
    inputSchema: z.object({
      owner: z.string().describe("GitHub repository owner/organization name"),
      repo: z.string().describe("GitHub repository name"),
      pullNumber: z.number().describe("Pull request number"),
      token: z.string().optional().describe("GitHub access token for private repos"),
    }),
    outputSchema: z.array(
      z.object({
        id: z.number(),
        author: z.string(),
        state: z.string(),
        body: z.string().nullable(),
        submittedAt: z.string().nullable(),
        htmlUrl: z.string(),
      })
    ),
  },

  // CI & Project Health Tools
  {
    name: "getRepoWorkflows",
    description:
      "Get GitHub Actions workflows defined in the repository.",
    tool: getRepoWorkflows,
    inputSchema: z.object({
      owner: z.string().describe("GitHub repository owner/organization name"),
      repo: z.string().describe("GitHub repository name"),
      token: z.string().optional().describe("GitHub access token for private repos"),
    }),
    outputSchema: z.array(
      z.object({
        id: z.number(),
        name: z.string(),
        path: z.string(),
        state: z.string(),
        createdAt: z.string(),
        updatedAt: z.string(),
        htmlUrl: z.string(),
      })
    ),
  },
  {
    name: "getWorkflowRuns",
    description:
      "Get recent workflow runs for a repository or specific workflow.",
    tool: getWorkflowRuns,
    inputSchema: z.object({
      owner: z.string().describe("GitHub repository owner/organization name"),
      repo: z.string().describe("GitHub repository name"),
      workflowId: z.number().optional().describe("Specific workflow ID to filter runs"),
      limit: z.number().optional().describe("Number of runs to fetch (default 10, max 30)"),
      token: z.string().optional().describe("GitHub access token for private repos"),
    }),
    outputSchema: z.array(
      z.object({
        id: z.number(),
        name: z.string(),
        status: z.string().nullable(),
        conclusion: z.string().nullable(),
        workflowId: z.number(),
        branch: z.string().nullable(),
        event: z.string(),
        createdAt: z.string(),
        updatedAt: z.string(),
        htmlUrl: z.string(),
        runNumber: z.number(),
      })
    ),
  },
  {
    name: "getCommunityFiles",
    description:
      "Get community/health files from a repository like CODE_OF_CONDUCT, CONTRIBUTING, CODEOWNERS, SECURITY, etc.",
    tool: getCommunityFiles,
    inputSchema: z.object({
      owner: z.string().describe("GitHub repository owner/organization name"),
      repo: z.string().describe("GitHub repository name"),
      token: z.string().optional().describe("GitHub access token for private repos"),
    }),
    outputSchema: z.array(
      z.object({
        name: z.string(),
        path: z.string(),
        exists: z.boolean(),
        content: z.string().optional(),
      })
    ),
  },

  // ============================================
  // PULL REQUEST DIFF TOOLS
  // ============================================
  {
    name: "getPullRequestDiff",
    description:
      "Get the full diff/patch for a pull request. Returns the unified diff showing all changes.",
    tool: getPullRequestDiff,
    inputSchema: z.object({
      owner: z.string().describe("GitHub repository owner/organization name"),
      repo: z.string().describe("GitHub repository name"),
      pullNumber: z.number().describe("Pull request number"),
      token: z.string().optional().describe("GitHub access token for private repos"),
    }),
    outputSchema: z.object({
      prNumber: z.number(),
      title: z.string(),
      state: z.string(),
      additions: z.number(),
      deletions: z.number(),
      changedFiles: z.number(),
      diff: z.string(),
    }),
  },
  {
    name: "getPullRequestFiles",
    description:
      "Get the list of files changed in a pull request with their individual patches and stats.",
    tool: getPullRequestFiles,
    inputSchema: z.object({
      owner: z.string().describe("GitHub repository owner/organization name"),
      repo: z.string().describe("GitHub repository name"),
      pullNumber: z.number().describe("Pull request number"),
      token: z.string().optional().describe("GitHub access token for private repos"),
    }),
    outputSchema: z.array(
      z.object({
        filename: z.string(),
        status: z.string(),
        additions: z.number(),
        deletions: z.number(),
        changes: z.number(),
        patch: z.string().optional(),
        previousFilename: z.string().optional(),
      })
    ),
  },
  {
    name: "getPRFileContent",
    description:
      "Get the content of a specific file from a pull request's head branch. Use this to read the actual file content from a PR.",
    tool: getPRFileContent,
    inputSchema: z.object({
      owner: z.string().describe("GitHub repository owner/organization name"),
      repo: z.string().describe("GitHub repository name"),
      pullNumber: z.number().describe("Pull request number"),
      path: z.string().describe("Path to the file within the repository"),
      token: z.string().optional().describe("GitHub access token for private repos"),
    }),
    outputSchema: z.object({
      path: z.string(),
      content: z.string(),
      size: z.number(),
      encoding: z.string(),
    }),
  },

  // Population Tools (existing)
  {
    name: "countryPopulation",
    description:
      "A tool to get population statistics by country with advanced filtering options",
    tool: getCountryPopulations,
    inputSchema: z.object({
      continent: z.string().optional(),
      sortBy: z.enum(["population", "growthRate"]).optional(),
      limit: z.number().optional(),
      order: z.enum(["asc", "desc"]).optional(),
    }),
    outputSchema: z.array(
      z.object({
        countryCode: z.string(),
        countryName: z.string(),
        continent: z.enum([
          "Asia",
          "Africa",
          "Europe",
          "North America",
          "South America",
          "Oceania",
        ]),
        population: z.number(),
        year: z.number(),
        growthRate: z.number(),
      }),
    ),
  },
  {
    name: "globalPopulation",
    description:
      "A tool to get global population trends with optional year range filtering",
    tool: getGlobalPopulationTrend,
    inputSchema: z.object({
      startYear: z.number().optional(),
      endYear: z.number().optional(),
    }),
    outputSchema: z.array(
      z.object({
        year: z.number(),
        population: z.number(),
        growthRate: z.number(),
      }),
    ),
  },
];

/**
 * components
 *
 * This array contains all the Tambo components that are registered for use within the application.
 * Each component is defined with its name, description, and expected props. The components
 * can be controlled by AI to dynamically render UI elements based on user interactions.
 */
export const components: TamboComponent[] = [
  {
    name: "Graph",
    description:
      "A component that renders various types of charts (bar, line, pie) using Recharts. Supports customizable data visualization with labels, datasets, and styling options.",
    component: Graph,
    propsSchema: graphSchema,
  },
  {
    name: "DataCard",
    description:
      "A component that displays options as clickable cards with links and summaries with the ability to select multiple items.",
    component: DataCard,
    propsSchema: dataCardSchema,
  },
];
