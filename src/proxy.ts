import { NextResponse, type NextRequest } from "next/server";

import { sessionCookieName, verifySessionToken } from "@/lib/auth/session";

const protectedRoutes = [
  "/dashboard",
  "/bugs",
  "/kanban",
  "/testes",
  "/releases",
  "/quality-map",
  "/analytics",
  "/projetos",
  "/equipe",
  "/notificacoes",
  "/configuracoes",
  "/perfil",
  "/onboarding",
];

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const session = verifySessionToken(
    request.cookies.get(sessionCookieName)?.value,
  );
  const isProtected = protectedRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );

  if (isProtected && !session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
