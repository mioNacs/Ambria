import type { TamboComponent, TamboTool } from "@tambo-ai/react";
import { z } from "zod";
import {
  OpenSourceGuide,
  openSourceGuideSchema,
} from "@/components/tambo/ask-ambria/open-source-guide";
import {
  OpenSourceProjectList,
  openSourceProjectListSchema,
} from "@/components/tambo/ask-ambria/open-source-project-list";
import {
  searchOpenSourceProjects,
  type OpenSourceSkillLevel,
} from "@/services/ask-ambria/search-open-source-projects";

const openSourceSkillLevelSchema = z.enum([
  "beginner",
  "intermediate",
  "advanced",
]) satisfies z.ZodType<OpenSourceSkillLevel>;

export const askAmbriaTools: TamboTool[] = [
  {
    name: "searchOpenSourceProjects",
    description:
      "Search GitHub for active, beginner-friendly open source repositories. Use this when a user asks for project recommendations; ask for their preferred tech stack (language) and skill level first.",
    tool: searchOpenSourceProjects,
    inputSchema: z.object({
      techStack: z
        .string()
        .optional()
        .describe(
          "Preferred language/tech stack (e.g., TypeScript, Python, Go). If the user doesn't care, omit.",
        ),
      skillLevel: openSourceSkillLevelSchema.describe(
        "User skill level (beginner, intermediate, advanced)",
      ),
      interest: z
        .string()
        .optional()
        .describe(
          "Optional interest/topic to narrow results (e.g., 'cli', 'react', 'data-science')",
        ),
      limit: z
        .number()
        .optional()
        .describe("How many repositories to return (default 6, max 10)"),
    }),
    outputSchema: z.object({
      query: z.string().describe("The GitHub search query used"),
      totalCount: z.number().describe("Total results matching the query"),
      projects: z.array(
        z.object({
          fullName: z.string(),
          htmlUrl: z.string(),
          description: z.string().nullable(),
          stars: z.number(),
          language: z.string().nullable(),
          topics: z.array(z.string()),
          updatedAt: z.string(),
        }),
      ),
    }),
  },
];

export const askAmbriaComponents: TamboComponent[] = [
  {
    name: "OpenSourceGuide",
    description:
      "A compact guide for common open-source questions (what it is, etiquette, finding projects, and raising good PRs).",
    component: OpenSourceGuide,
    propsSchema: openSourceGuideSchema,
  },
  {
    name: "OpenSourceProjectList",
    description:
      "A list of recommended open source projects with links and quick stats. Useful after calling searchOpenSourceProjects.",
    component: OpenSourceProjectList,
    propsSchema: openSourceProjectListSchema,
  },
];
