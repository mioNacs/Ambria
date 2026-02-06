import { getRepoPullRequests } from "@/services/github-repo";
import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const requestSchema = z.object({
  owner: z.string().min(1),
  repo: z.string().min(1),
  state: z.enum(["open", "closed", "all"]).optional(),
  limit: z.coerce.number().int().positive().max(50).optional(),
  page: z.coerce.number().int().positive().max(100).optional(),
  token: z.string().optional(),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);

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
    const pullRequests = await getRepoPullRequests(parsed.data);
    return NextResponse.json({ pullRequests });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
