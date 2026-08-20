export function CourseBoyLogo({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 32 32"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* head */}
      <circle cx="16" cy="19" fill="#ffffff" r="9" stroke="#1c1917" strokeWidth="2" />

      {/* mortarboard band around the head */}
      <path
        d="M8 11.5 Q16 16 24 11.5 L24 14.5 Q16 19 8 14.5 Z"
        fill="#78716c"
        stroke="#1c1917"
        strokeWidth="1.4"
      />

      {/* mortarboard */}
      <path d="M16 3 29 9 16 15 3 9 Z" fill="#1c1917" />
      <circle cx="16" cy="9" fill="#e7e5e4" r="1.1" />
      <path d="M16 9 Q22 11 21 17" fill="none" stroke="#1c1917" strokeLinecap="round" strokeWidth="1.3" />
      <circle cx="21" cy="18" fill="#78716c" r="1.4" stroke="#1c1917" strokeWidth="1" />

      {/* eyebrows */}
      <path d="M11 17.5 Q13 16 15 17.5" stroke="#1c1917" strokeLinecap="round" strokeWidth="1.5" />
      <path d="M17 17.5 Q19 16 21 17.5" stroke="#1c1917" strokeLinecap="round" strokeWidth="1.5" />

      {/* eyes */}
      <circle cx="13" cy="20" fill="#1c1917" r="1.3" />
      <circle cx="19" cy="20" fill="#1c1917" r="1.3" />

      {/* big open grin */}
      <path
        d="M10.5 23 Q16 29 21.5 23 Q16 25.8 10.5 23 Z"
        fill="#1c1917"
      />
    </svg>
  );
}
