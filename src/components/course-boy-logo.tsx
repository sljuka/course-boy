export function CourseBoyLogo({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 32 32"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="16" cy="19" fill="#FDBA74" r="8.5" />
      <circle cx="12.75" cy="18.25" fill="#7C2D12" r="1.15" />
      <circle cx="19.25" cy="18.25" fill="#7C2D12" r="1.15" />
      <path
        d="M12.5 22c1 1 2.3 1.5 3.5 1.5s2.5-.5 3.5-1.5"
        stroke="#7C2D12"
        strokeLinecap="round"
        strokeWidth="1.3"
      />
      <path d="M16 5.5 27.5 10.5 16 15.5 4.5 10.5 16 5.5Z" fill="#C2410C" />
      <path
        d="M9.5 12.3v4.7c0 1.7 2.9 3 6.5 3s6.5-1.3 6.5-3v-4.7"
        stroke="#C2410C"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.4"
      />
      <path d="M24.5 11.5v6.3" stroke="#7C2D12" strokeLinecap="round" strokeWidth="1.3" />
      <circle cx="24.5" cy="19.1" fill="#7C2D12" r="1.1" />
    </svg>
  );
}
