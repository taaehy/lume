import "server-only";
export type Provider = "google" | "github";
export function providerConfig(provider: Provider) {
  const prefix = provider.toUpperCase();
  return {
    clientId: process.env[prefix + "_CLIENT_ID"],
    clientSecret: process.env[prefix + "_CLIENT_SECRET"],
  };
}
export function configuredProviders() {
  return {
    google: Boolean(
      providerConfig("google").clientId &&
      providerConfig("google").clientSecret,
    ),
    github: Boolean(
      providerConfig("github").clientId &&
      providerConfig("github").clientSecret,
    ),
  };
}
export function appOrigin() {
  const url = new URL(
    process.env.APP_URL ??
      process.env.NEXT_PUBLIC_APP_URL ??
      "http://localhost:3000",
  );
  if (process.env.NODE_ENV === "production" && url.protocol !== "https:")
    throw new Error("APP_URL deve usar HTTPS em produção.");
  return url.origin;
}
