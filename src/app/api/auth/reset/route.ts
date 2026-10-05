import { passwordRecovery } from "@/lib/auth/recovery";
export const runtime = "nodejs";
export async function POST(request: Request) {
  return passwordRecovery(request, true);
}
