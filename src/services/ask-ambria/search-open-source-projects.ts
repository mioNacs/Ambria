/**
* @file search-open-source-projects.ts
* @description Tooling for Ask Ambria: recommend beginner-friendly open source projects.
*/

import { Octokit } from "@octokit/rest";

function toErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export type OpenSourceSkillLevel = "beginner" | "intermediate" | "advanced";

export interface OpenSourceProject {
  fullName: string;
  htmlUrl: string;
  description: string | null;
  stars: number;
  language: string | null;
  topics: string[];
  updatedAt: string;
}

function getIsoDateDaysAgo(daysAgo: number): string {
  const msAgo = daysAgo * 24 * 60 * 60 * 1000;
  return new Date(Date.now() - msAgo).toISOString().slice(0, 10);
}

function normalizeOptionalInput(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return;

  const lowered = trimmed.toLowerCase();
  if (["any", "none", "n/a", "na"].includes(lowered)) return;

  return trimmed;
}

function normalizeTechStack(value: string | undefined): string | undefined {
  const normalized = normalizeOptionalInput(value);
  if (!normalized) return;

  // If a user types a comma-separated list, use their first preference.
  return normalized.split(",")[0]?.trim() || undefined;
}

function buildRepoSearchQuery(params: {
  techStack?: string;
  skillLevel: OpenSourceSkillLevel;
  interest?: string;
  pushedAfter: string;
}): string {
  const techStack = normalizeTechStack(params.techStack);
  const interest = normalizeOptionalInput(params.interest);

  const qualifiers: string[] = [
    "is:public",
    "fork:false",
    "archived:false",
    `pushed:>${params.pushedAfter}`,
    "stars:>50",
  ];

  if (techStack) {
    qualifiers.push(`language:"${techStack.replaceAll('"', "")}"`);
  }

  if (interest) {
    const normalizedTopic = interest
      .toLowerCase()
      .replaceAll(/[^a-z0-9-]+/g, "-")
      .replaceAll(/-+/g, "-")
      .replaceAll(/^-|-$/g, "");
    if (normalizedTopic) {
      qualifiers.push(`topic:${normalizedTopic}`);
    }
  }

  if (params.skillLevel === "beginner") {
    qualifiers.push("good-first-issues:>0");
  } else {
    qualifiers.push("help-wanted-issues:>0");
  }

  return qualifiers.join(" ");
}

export async function searchOpenSourceProjects(params: {
  techStack?: string;
  skillLevel: OpenSourceSkillLevel;
  interest?: string;
  limit?: number;
  token?: string;
}): Promise<{ query: string; totalCount: number; projects: OpenSourceProject[] }> {
  const pushedAfter = getIsoDateDaysAgo(365);
  const primaryQuery = buildRepoSearchQuery({
    techStack: params.techStack,
    skillLevel: params.skillLevel,
    interest: params.interest,
    pushedAfter,
  });

  const octokit = new Octokit({
    auth: params.token,
  });

  try {
    const limit = Math.min(Math.max(params.limit ?? 6, 1), 10);

    const runSearch = async (query: string) => {
      return await octokit.rest.search.repos({
        q: query,
        sort: "stars",
        order: "desc",
        per_page: limit,
      });
    };

    let query = primaryQuery;
    let { data } = await runSearch(query);

    if (data.total_count === 0 && params.interest) {
      query = buildRepoSearchQuery({
        techStack: params.techStack,
        skillLevel: params.skillLevel,
        pushedAfter,
      });

      ({ data } = await runSearch(query));
    }

    const projects: OpenSourceProject[] = data.items.map((item) => ({
      fullName: item.full_name,
      htmlUrl: item.html_url,
      description: item.description,
      stars: item.stargazers_count,
      language: item.language,
      topics: item.topics ?? [],
      updatedAt: item.updated_at,
    }));

    return {
      query,
      totalCount: data.total_count,
      projects,
    };
  } catch (error) {
    const message = toErrorMessage(error);
    if (process.env.NODE_ENV !== "production") {
      console.error("Error searching open source projects:", message);
    }
    throw new Error(`Failed to search open source projects: ${message}`);
  }
}
