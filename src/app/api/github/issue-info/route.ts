import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { getRepoIssue, Issue } from "@/services/github-repo";
import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const requestSchema = z.object({
  owner: z.string().trim().min(1),
  repo: z.string().trim().min(1),
  issueNumber: z.coerce.number().int().positive(),
  token: z.string().trim().min(1).optional(),
});

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
    console.error("Invalid request parameters", body, parsed.error);
    return NextResponse.json(
      { error: "Invalid request parameters" },
      { status: 400 },
    );
  }

  const token = await getEffectiveToken(parsed.data.token);
  // We allow fetching public issues without token? 
  // getRepoIssue accepts optional token. If undefined, it uses unauthenticated request (rate limited).
  // But for private repos, token is needed.
  // Let's pass whatever we have.

  const { owner, repo, issueNumber } = parsed.data;

  try {
    const issue = await getRepoIssue({
      owner,
      repo,
      issueNumber,
      token,
    });

    return NextResponse.json({ issue });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
