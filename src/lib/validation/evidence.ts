const configuredLimit = Number(process.env.NEXT_PUBLIC_UPLOAD_MAX_MB ?? 20);
export const evidenceMaxMb =
  Number.isFinite(configuredLimit) && configuredLimit > 0
    ? Math.min(configuredLimit, 20)
    : 20;
export const evidenceMaxBytes = evidenceMaxMb * 1024 * 1024;
