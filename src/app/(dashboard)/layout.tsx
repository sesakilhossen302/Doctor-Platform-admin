'use client';

import {
  CalendarCheck,
  Headphones,
  Layers,
  Receipt,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  Moon,
  Plug,
  ScrollText,
  Stethoscope,
  Sun,
  UserCog,
  Users,
  Wallet,
  X,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Avatar } from '@/components/ui/primitives';
import { api, session, type SessionUser } from '@/lib/api';
import { closeSocket } from '@/lib/realtime';
import { cn, ROLE_LABEL } from '@/lib/utils';

type NavItem = { href: string; label: string; icon: LucideIcon; agent?: boolean };
const NAV: { section: string; items: NavItem[] }[] = [
  { section: 'Overview', items: [{ href: '/', label: 'Dashboard', icon: LayoutDashboard }] },
  {
    section: 'Operations',
    items: [
      { href: '/call-center', label: 'Call center', icon: Headphones, agent: true },
      { href: '/appointments', label: 'Appointments', icon: CalendarCheck },
      { href: '/doctors', label: 'Doctors', icon: Stethoscope },
      { href: '/patients', label: 'Patients', icon: Users },
      { href: '/payments', label: 'Payments', icon: Receipt },
    ],
  },
  {
    section: 'Master data',
    items: [
      { href: '/specialties', label: 'Specialties', icon: Layers },
      { href: '/locations', label: 'Locations', icon: MapPin },
    ],
  },
  {
    section: 'Settings',
    items: [
      { href: '/integrations', label: 'Integrations', icon: Plug },
      { href: '/fees', label: 'Platform fees', icon: Wallet },
      { href: '/staff', label: 'Staff & roles', icon: UserCog },
      { href: '/audit', label: 'Audit log', icon: ScrollText },
    ],
  },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [open, setOpen] = useState(false);
  const [dark, setDark] = useState(false);

  useEffect(() => {
    if (!session.access) {
      router.replace('/login');
      return;
    }
    const u = session.user;
    setUser(u);
    setDark(document.documentElement.classList.contains('dark'));
    // Call agents only have access to the call center.
    if (u?.role === 'CALL_AGENT' && !location.pathname.startsWith('/call-center')) router.replace('/call-center');
  }, [router]);

  useEffect(() => setOpen(false), [pathname]);

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    try {
      localStorage.setItem('theme', next ? 'dark' : 'light');
    } catch {}
  };

  const logout = async () => {
    const refreshToken = session.refresh;
    if (refreshToken) await api('/auth/logout', { method: 'POST', body: { refreshToken } }).catch(() => undefined);
    session.clear();
    closeSocket();
    router.replace('/login');
  };

  if (!user) return null;

  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));

  const sidebar = (
    <nav className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-2.5 px-5">
        <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Stethoscope className="size-[18px]" />
        </span>
        <div className="leading-tight">
          <p className="text-[15px] font-semibold">Doctor Platform</p>
          <p className="text-[11px] text-muted">Admin console</p>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-2">
        {NAV.map((group) => ({ ...group, items: user.role === 'CALL_AGENT' ? group.items.filter((i) => i.agent) : group.items }))
          .filter((group) => group.items.length)
          .map((group) => (
          <div key={group.section} className="mb-5">
            <p className="px-3 pb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted/80">{group.section}</p>
            {group.items.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  'mb-0.5 flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                  isActive(href) ? 'bg-primary-soft font-medium text-primary' : 'text-muted hover:bg-surface-muted hover:text-foreground',
                )}
              >
                <Icon className="size-[18px]" />
                {label}
              </Link>
            ))}
          </div>
        ))}
      </div>
      <div className="border-t border-border p-3">
        <div className="flex items-center gap-3 rounded-lg px-2 py-2">
          <Avatar name={user.name ?? user.email} size={34} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{user.name ?? 'Admin'}</p>
            <p className="truncate text-xs text-muted">{ROLE_LABEL[user.role] ?? user.role}</p>
          </div>
          <button onClick={logout} className="rounded-md p-1.5 text-muted hover:bg-surface-muted hover:text-danger" title="Sign out" aria-label="Sign out">
            <LogOut className="size-4" />
          </button>
        </div>
      </div>
    </nav>
  );

  return (
    <div className="min-h-screen">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-border bg-surface lg:block">{sidebar}</aside>

      {/* Mobile sidebar */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-950/40" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 border-r border-border bg-surface shadow-xl">
            <button onClick={() => setOpen(false)} className="absolute right-3 top-4 rounded-md p-1.5 text-muted" aria-label="Close menu">
              <X className="size-5" />
            </button>
            {sidebar}
          </aside>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-surface/85 px-4 backdrop-blur sm:px-6 lg:px-8">
          <button onClick={() => setOpen(true)} className="rounded-md p-1.5 text-muted lg:hidden" aria-label="Open menu">
            <Menu className="size-5" />
          </button>
          <div className="flex-1" />
          <span className="hidden rounded-full bg-warning-soft px-2.5 py-1 text-xs font-medium text-warning sm:inline">Demo environment</span>
          <button onClick={toggleTheme} className="rounded-lg p-2 text-muted hover:bg-surface-muted hover:text-foreground" aria-label="Toggle theme">
            {dark ? <Sun className="size-[18px]" /> : <Moon className="size-[18px]" />}
          </button>
        </header>
        <main className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
