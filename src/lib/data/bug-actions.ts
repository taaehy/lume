"use server";

import { revalidatePath } from "next/cache";

import { calculateQualityScore } from "@/lib/domain/quality-score";
import { createBugRecord, getCurrentProjectContext } from "@/lib/data/bugs";
import { bugReportSchema, type BugReportValues } from "@/lib/validation/bug";

export type BugActionResult =
  { ok: true; friendlyId: string } | { ok: false; message: string };

export async function createBugAction(
  values: BugReportValues,
): Promise<BugActionResult> {
  const parsed = bugReportSchema.safeParse(values);
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Revise os campos.",
    };
  }
  const project = await getCurrentProjectContext();
  const quality = calculateQualityScore({ ...parsed.data, evidenceCount: 0 });
  const bug = await createBugRecord({
    organizationId: project.organizationId,
    projectId: project.projectId,
    ...parsed.data,
    qualityScore: quality.score,
    qualityBreakdown: { version: 1, criteria: quality.criteria },
  });
  revalidatePath("/bugs");
  return { ok: true, friendlyId: bug.friendlyId };
}
