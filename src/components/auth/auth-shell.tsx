import type { ReactNode } from "react";
import Link from "next/link";
import { LumeSymbol } from "@/components/lume-symbol";

export function AuthShell({
  title,
  description,
  children,
  footer,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="auth-surface relative min-h-screen overflow-hidden bg-[#fff8eb] text-[#101a35]">
      <div aria-hidden="true" className="auth-orbit auth-orbit-top" />
      <div aria-hidden="true" className="auth-orbit auth-orbit-bottom" />
      <main className="relative z-10 mx-auto grid min-h-screen w-full max-w-[1540px] items-center gap-12 px-6 py-10 sm:px-10 lg:grid-cols-[minmax(0,1fr)_minmax(480px,610px)] lg:gap-20 lg:px-16 xl:px-24">
        <section className="py-8 lg:py-0">
          <Link
            href="/"
            className="inline-flex items-center gap-4"
            aria-label="Lume — início"
          >
            <LumeSymbol className="h-20 w-16 shrink-0 drop-shadow-[0_8px_14px_rgba(255,163,35,0.18)]" />
            <span className="text-[46px] font-bold leading-none tracking-[-0.055em] text-[#101a35]">
              Lume
            </span>
          </Link>
          <h1 className="mt-16 max-w-[700px] text-[clamp(3.5rem,6.4vw,6.8rem)] font-bold leading-[0.92] tracking-[-0.065em] text-[#101a35]">
            Clareza para entregar melhor
          </h1>
          <p className="mt-8 max-w-[590px] text-xl leading-relaxed text-[#364155] sm:text-2xl">
            Garanta a qualidade do seu software com clareza, precisão e menos
            incertezas.
          </p>
        </section>
        <section className="w-full rounded-[36px] border border-white/90 bg-white/80 px-6 py-10 shadow-[0_32px_90px_rgba(148,102,36,0.10)] backdrop-blur-xl sm:px-12 sm:py-14">
          <div className="text-center">
            <h2 className="text-4xl font-bold tracking-[-0.04em] text-[#101a35] sm:text-5xl">
              {title}
            </h2>
            {description ? (
              <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-[#73776e]">
                {description}
              </p>
            ) : null}
          </div>
          <div className="mt-10">{children}</div>
          <div className="mt-8 text-center text-sm text-[#28334a]">
            {footer}
          </div>
        </section>
      </main>
    </div>
  );
}
