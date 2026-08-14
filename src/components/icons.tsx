type IconProps = { className?: string };

function base(paths: React.ReactNode) {
  return function Icon({ className = "h-5 w-5" }: IconProps) {
    return (
      <svg
        className={className}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {paths}
      </svg>
    );
  };
}

export const HomeIcon = base(
  <path d="M3 11.5 12 4l9 7.5M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9" />,
);

export const UsersIcon = base(
  <>
    <circle cx="9" cy="8" r="3" />
    <path d="M3 20c0-3 2.5-5 6-5s6 2 6 5" />
    <path d="M16 5.5a3 3 0 0 1 0 6" />
    <path d="M15 15c2.8.4 4 2 4 5" />
  </>,
);

export const BookIcon = base(
  <>
    <path d="M4 5.5C4 4.7 4.7 4 5.5 4H12v16H5.5A1.5 1.5 0 0 1 4 18.5v-13Z" />
    <path d="M20 5.5c0-.8-.7-1.5-1.5-1.5H12v16h6.5a1.5 1.5 0 0 0 1.5-1.5v-13Z" />
  </>,
);

export const DocumentIcon = base(
  <>
    <path d="M7 3.5h7L18.5 8V20a1 1 0 0 1-1 1h-10a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z" />
    <path d="M14 3.5V8h4.5" />
    <path d="M9 13h6M9 16.5h6" />
  </>,
);

export const CalendarIcon = base(
  <>
    <rect x="3.5" y="5" width="17" height="15.5" rx="1.5" />
    <path d="M3.5 9.5h17M8 3v3.5M16 3v3.5" />
  </>,
);

export const CashIcon = base(
  <>
    <rect x="2.5" y="6.5" width="19" height="11" rx="1.5" />
    <circle cx="12" cy="12" r="2.5" />
    <path d="M5.5 9v.01M18.5 15v.01" />
  </>,
);

export const LogoutIcon = base(
  <>
    <path d="M9 4H6a1.5 1.5 0 0 0-1.5 1.5v13A1.5 1.5 0 0 0 6 20h3" />
    <path d="M14 16l4-4-4-4" />
    <path d="M18 12H9" />
  </>,
);

export const MenuIcon = base(<path d="M4 6h16M4 12h16M4 18h16" />);

export const CheckCircleIcon = base(
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="m8.5 12.5 2.3 2.3L15.5 9.5" />
  </>,
);

export const LinkIcon = base(
  <>
    <path d="M9.5 14.5 14.5 9.5" />
    <path d="M11 6.5 12.5 5a3.5 3.5 0 0 1 5 5L16 11.5" />
    <path d="M13 17.5 11.5 19a3.5 3.5 0 0 1-5-5L8 12.5" />
  </>,
);
