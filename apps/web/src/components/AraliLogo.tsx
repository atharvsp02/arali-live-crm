export function AraliLogo({ className = "" }: { className?: string }) {
  return (
    <span className={`arali-logo ${className}`.trim()}>
      <svg className="arali-logo-mark" viewBox="0 0 32 32" aria-hidden="true">
        <path
          fill="currentColor"
          fillRule="evenodd"
          d="M16 2.75 29.25 28h-6.7l-2.7-5.55h-7.7L9.45 28h-6.7L16 2.75Zm0 8.65-2.25 5.75h4.5L16 11.4Z"
          clipRule="evenodd"
        />
      </svg>
    </span>
  );
}
