/** The app's brand icon. */
export function Logo({ className = "h-8 w-8" }: { className?: string }) {
  return <img src="/logo.png" alt="UG Thesis Management" className={className} />;
}
