"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/actions";
import type { Role, SessionUser } from "@/lib/auth";
import {
  HomeIcon,
  UsersIcon,
  BookIcon,
  DocumentIcon,
  CalendarIcon,
  CashIcon,
  LogoutIcon,
} from "./icons";
import { Logo } from "./logo";

type NavItem = { href: string; label: string; icon: (p: { className?: string }) => React.ReactElement };

const NAV: Record<Role, NavItem[]> = {
  ADMIN: [
    { href: "/admin", label: "Overview", icon: HomeIcon },
    { href: "/admin/users", label: "Users", icon: UsersIcon },
    { href: "/admin/theses", label: "Theses", icon: BookIcon },
  ],
  STUDENT: [
    { href: "/student", label: "Overview", icon: HomeIcon },
    { href: "/student/chapters", label: "Chapters", icon: DocumentIcon },
    { href: "/student/meetings", label: "Meetings", icon: CalendarIcon },
  ],
  LECTURER: [{ href: "/lecturer", label: "My Theses", icon: BookIcon }],
  FINANCE: [{ href: "/finance", label: "Payments", icon: CashIcon }],
};

function activeHrefFor(pathname: string, items: NavItem[]): string | undefined {
  return [...items]
    .sort((a, b) => b.href.length - a.href.length)
    .find((i) => pathname === i.href || pathname.startsWith(i.href + "/"))?.href;
}

function NavLinks({
  items,
  activeHref,
  onNavigate,
}: {
  items: NavItem[];
  activeHref?: string;
  onNavigate?: () => void;
}) {
  return (
    <>
      {items.map((item) => {
        const Icon = item.icon;
        const active = item.href === activeHref;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              active
                ? "bg-blue-50 text-blue-700"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <Icon className="h-5 w-5 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </>
  );
}

export function Sidebar({ user }: { user: SessionUser }) {
  const pathname = usePathname();
  const items = NAV[user.role];
  const activeHref = activeHrefFor(pathname, items);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white md:flex">
        <div className="flex items-center gap-2.5 border-b border-slate-200 px-5 py-4">
          <Link href="/" className="flex items-center gap-2.5">
            <Logo className="h-8 w-8 shrink-0" />
            <span className="text-sm font-semibold leading-tight text-blue-800">
              UG Thesis
              <br />
              Management
            </span>
          </Link>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4">
          <NavLinks items={items} activeHref={activeHref} />
        </nav>
        <div className="border-t border-slate-200 p-4">
          <p className="truncate text-sm font-medium text-slate-800">{user.name}</p>
          <p className="mb-3 text-xs uppercase tracking-wide text-slate-400">{user.role}</p>
          <form action={logout}>
            <button className="flex w-full items-center justify-center gap-2 rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100">
              <LogoutIcon className="h-4 w-4" />
              Log out
            </button>
          </form>
        </div>
      </aside>

      {/* Mobile header + horizontal nav */}
      <div className="flex w-full flex-col md:hidden">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
          <Link href="/" className="flex items-center gap-2 text-sm font-semibold text-blue-800">
            <Logo className="h-7 w-7 shrink-0" />
            UG Thesis Management
          </Link>
          <form action={logout}>
            <button className="flex items-center gap-1 text-xs text-slate-500">
              <LogoutIcon className="h-4 w-4" />
              Log out
            </button>
          </form>
        </header>
        <nav className="flex gap-1 overflow-x-auto border-b border-slate-200 bg-white px-2 py-2">
          <NavLinks items={items} activeHref={activeHref} />
        </nav>
      </div>
    </>
  );
}
