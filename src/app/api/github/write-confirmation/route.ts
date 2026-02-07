import { createGitHubWriteConfirmation } from "@/lib/github-write-confirmation";
import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const requestSchema = z.object({
  owner: z.string().trim().min(1),
  repo: z.string().trim().min(1),
  kind: z.enum([
    "issue",
    "pull_request",
    "comment",
    "issue_assignees",
    "issue_close",
    "pull_request_merge",
    "pull_request_close",
  ]),
  ttlMs: z.coerce.number().int().positive().max(10 * 60 * 1000).optional(),
});

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

  const confirmationId = createGitHubWriteConfirmation({
    owner: parsed.data.owner,
    repo: parsed.data.repo,
    kind: parsed.data.kind,
    ttlMs: parsed.data.ttlMs,
  });

  return NextResponse.json({ confirmationId });
}
