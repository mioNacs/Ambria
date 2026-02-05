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
} from "@/services/github-repo";
import type { TamboComponent } from "@tambo-ai/react";
import { TamboTool } from "@tambo-ai/react";
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
      "Get the file tree structure of the current GitHub repository. Use this to understand what files and folders exist in the project. Returns a list of file paths and their types (file or directory).",
    tool: getRepoTree,
    inputSchema: z.object({
      owner: z.string().describe("GitHub repository owner/organization name"),
      repo: z.string().describe("GitHub repository name"),
      path: z.string().optional().describe("Optional path to filter the tree (e.g., 'src' to only show files in src folder)"),
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
      "Get the content of a specific file from the GitHub repository. Use this to read source code files, configuration files, or documentation. Provide the full file path from the repository root.",
    tool: getFileContent,
    inputSchema: z.object({
      owner: z.string().describe("GitHub repository owner/organization name"),
      repo: z.string().describe("GitHub repository name"),
      path: z.string().describe("Full path to the file (e.g., 'src/index.ts' or 'README.md')"),
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
      "Get the content of multiple files at once. Use this to read related files together, like a component and its styles, or a function and its tests. Limited to 5 files maximum.",
    tool: getMultipleFiles,
    inputSchema: z.object({
      owner: z.string().describe("GitHub repository owner/organization name"),
      repo: z.string().describe("GitHub repository name"),
      paths: z.array(z.string()).describe("Array of file paths to fetch (max 5)"),
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
