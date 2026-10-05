import { handleApi } from "@/lib/api";
export const runtime = "nodejs";
type Context = { params: Promise<{ segments: string[] }> };
async function handler(request: Request, context: Context) {
  const { segments } = await context.params;
  return handleApi(request, segments);
}
export { handler as GET, handler as POST, handler as PATCH };
