import { startOAuth } from "@/lib/auth/oauth";
export const runtime = "nodejs";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ provider: string }> },
) {
  return startOAuth((await params).provider);
}
