import { getRepoIssues } from "@/services/github-repo";
import { parseGitHubUrl } from "@/lib/github";
import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const requestSchema = z.object({
  owner: z.string().min(1),
  repo: z.string().min(1),
  state: z.enum(["open", "closed", "all"]).optional(),
  labels: z.string().optional(),
  limit: z.coerce.number().int().positive().max(50).optional(),
  page: z.coerce.number().int().positive().max(100).optional(),
  token: z.string().optional(),
});

function normalizeOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as unknown;
  const input =
    body && typeof body === "object" ? (body as Record<string, unknown>) : null;

  let owner = normalizeOptionalString(input?.owner);
  let repo = normalizeOptionalString(input?.repo);

  if (!owner || !repo) {
    const candidates = [
      normalizeOptionalString(input?.repository),
      normalizeOptionalString(input?.repo),
      normalizeOptionalString(input?.owner),
    ].filter(Boolean) as string[];

    for (const candidate of candidates) {
      const parsed = parseGitHubUrl(candidate);
      if (!parsed) continue;
      owner ??= parsed.owner;
      repo ??= parsed.repo;
      break;
    }
  }

  const normalizedBody = {
    ...(input ?? {}),
    owner,
    repo,
    labels: normalizeOptionalString(input?.labels),
    token: normalizeOptionalString(input?.token),
  };

  const parsed = requestSchema.safeParse(normalizedBody);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid request",
        details: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  try {
    const limit = parsed.data.limit ?? 20;
    const page = parsed.data.page ?? 1;

    if (limit * page > 1000) {
      return NextResponse.json(
        {
          error: "Too many items requested; please narrow your query.",
        },
        { status: 400 },
      );
    }

    const issues = await getRepoIssues({
      ...parsed.data,
      limit,
      page,
    });
    return NextResponse.json({ issues });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
