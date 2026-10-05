import { useId } from "react";

/** Símbolo facetado da Lume: duas fitas douradas ao redor de um centro aberto. */
export function LumeSymbol({
  className = "h-10 w-10",
}: {
  className?: string;
}) {
  const id = useId().replace(/:/g, "");
  return (
    <svg
      viewBox="0 0 100 124"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient
          id={`${id}-gold`}
          x1="10"
          y1="15"
          x2="92"
          y2="112"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#FFE789" />
          <stop offset=".42" stopColor="#FFAB24" />
          <stop offset="1" stopColor="#F58A13" />
        </linearGradient>
        <linearGradient
          id={`${id}-light`}
          x1="20"
          y1="15"
          x2="75"
          y2="78"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#FFF2A9" />
          <stop offset="1" stopColor="#FFC23E" />
        </linearGradient>
      </defs>
      <path
        d="M49 2a5 5 0 0 1 6 0l39 27a12 12 0 0 1 5 10v27L77 73V47L55 32 4 68a3 3 0 0 1-4-3V36a11 11 0 0 1 5-9L49 2Z"
        fill={`url(#${id}-gold)`}
      />
      <path
        d="M14 30 55 32 55 2a5 5 0 0 0-6 0L14 30Z"
        fill={`url(#${id}-light)`}
      />
      <path d="m55 2 22 45 6-27L55 2Z" fill="#F39319" />
      <path
        d="m83 20-6 27 22 19V39a12 12 0 0 0-5-10L83 20Z"
        fill={`url(#${id}-light)`}
      />
      <path
        d="M99 66v25a12 12 0 0 1-5 10l-39 22a6 6 0 0 1-6 0L19 103a11 11 0 0 1-5-9V67a5 5 0 0 1 8-4l29 36L99 66Z"
        fill={`url(#${id}-gold)`}
      />
      <path d="m22 63 29 36-37-31a5 5 0 0 1 8-5Z" fill="#FFF0A0" />
      <path
        d="m51 99 4 24 39-22a12 12 0 0 0 5-10l-48 8Z"
        fill={`url(#${id}-light)`}
      />
      <path
        d="m14 68 37 31 4 24a6 6 0 0 1-6 0L19 103a11 11 0 0 1-5-9V68Z"
        fill="#FFA323"
      />
    </svg>
  );
}
