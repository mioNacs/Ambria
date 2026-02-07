import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { createIssueComment } from "@/services/github-repo";
import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const requestSchema = z.object({
  owner: z.string().trim().min(1),
  repo: z.string().trim().min(1),
  issueNumber: z.coerce.number().int().positive(),
  body: z.string().trim().min(1),
  confirmationId: z.string().trim().min(1),
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

  try {
    const comment = await createIssueComment({
      owner: parsed.data.owner,
      repo: parsed.data.repo,
      issueNumber: parsed.data.issueNumber,
      body: parsed.data.body,
      token,
      confirmationId: parsed.data.confirmationId,
    });

    return NextResponse.json({ comment });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
