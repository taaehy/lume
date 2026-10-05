import { finishOAuth } from "@/lib/auth/oauth";
export const runtime = "nodejs";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ provider: string }> },
) {
  return finishOAuth(request, (await params).provider);
}
