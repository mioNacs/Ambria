import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import {
  getPRReviews,
  getPullRequestConfirmationInfo,
  type PRReview,
} from "@/services/github-repo";
import { Octokit } from "@octokit/rest";
import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const requestSchema = z.object({
  owner: z.string().trim().min(1),
  repo: z.string().trim().min(1),
  pullNumber: z.coerce.number().int().positive(),
  token: z.string().trim().min(1).optional(),
});

function summarizeReviews(reviews: PRReview[]) {
  const latestByAuthor = new Map<string, string>();
  for (const review of reviews) {
    if (!review.author) continue;
    latestByAuthor.set(review.author, review.state);
  }

  let approvals = 0;
  let changesRequested = 0;
  for (const state of latestByAuthor.values()) {
    if (state === "APPROVED") approvals += 1;
    if (state === "CHANGES_REQUESTED") changesRequested += 1;
  }

  return { approvals, changesRequested };
}

async function getEffectiveToken(explicitToken: string | undefined) {
  if (explicitToken) return explicitToken;

  try {
    const supabase = await createSupabaseClient();
    const { data } = await supabase.auth.getSession();
    return data.session?.provider_token ?? undefined;
  } catch {
    return undefined;
  }
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as unknown;
  const parsed = requestSchema.safeParse(body);

  if (!parsed.success) {
    const flattened = parsed.error.flatten();
    return NextResponse.json(
      {
        error: "Invalid request",
        details: {
          formErrors: flattened.formErrors,
          fieldErrors: flattened.fieldErrors,
        },
      },
      { status: 400 },
    );
  }

  const token = await getEffectiveToken(parsed.data.token);
  if (!token) {
    return NextResponse.json(
      {
        error:
          "GitHub authentication required. Reconnect GitHub (OAuth) or provide a valid token.",
      },
      { status: 401 },
    );
  }

  const { owner, repo, pullNumber } = parsed.data;

  try {
    const octokit = new Octokit({ auth: token });

    const [{ data: repoData }, info, reviews] = await Promise.all([
      octokit.rest.repos.get({ owner, repo }),
      getPullRequestConfirmationInfo({ owner, repo, pullNumber, token }),
      getPRReviews({ owner, repo, pullNumber, token }),
    ]);

    const permissions = (repoData as { permissions?: Record<string, boolean> })
      .permissions;

    const permission = {
      access: permissions?.admin
        ? ("admin" as const)
        : permissions?.maintain || permissions?.push
          ? ("write" as const)
          : ("read" as const),
      admin: !!permissions?.admin,
      maintain: !!permissions?.maintain,
      push: !!permissions?.push,
      pull: !!permissions?.pull,
    };

    return NextResponse.json({
      info,
      permission,
      reviews: summarizeReviews(reviews),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
