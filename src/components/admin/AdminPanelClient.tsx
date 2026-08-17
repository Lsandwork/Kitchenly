"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import {
  Activity,
  BarChart3,
  Bell,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clapperboard,
  ExternalLink,
  FileText,
  Globe,
  HelpCircle,
  Image as ImageIcon,
  LayoutDashboard,
  LineChart,
  Mail,
  Menu,
  Newspaper,
  PenLine,
  Search,
  Settings,
  Share2,
  Users,
  Wand2,
  X,
} from "lucide-react";
import {
  ADMIN_APP_PATH,
  ADMIN_DASHBOARD_NAV,
  ADMIN_GENERATOR_TABS,
  ADMIN_MOBILE_TABS,
  adminMobileTabLabel,
  adminPageTitle,
  isAdminPageId,
  isGeneratorPage,
  type AdminNavBadgeKey,
  type AdminPageId,
} from "@/components/admin/admin-nav";
import { AdminWorkspace } from "@/components/admin/AdminWorkspace";

type Counts = Partial<Record<AdminNavBadgeKey, number>>;

type Props = {
  email: string | null;
  name: string | null;
  role: string;
};

const SIDEBAR_KEY = "kf_admin_sidebar_collapsed";

const ICONS: Record<string, typeof LayoutDashboard> = {
  overview: LayoutDashboard,
  users: Users,
  activity: Activity,
  reports: FileText,
  calendar: CalendarDays,
  articles: Newspaper,
  drafts: PenLine,
  scheduled: Clapperboard,
  published: Newspaper,
  generate: Wand2,
  "social-generator": Share2,
  media: ImageIcon,
  campaigns: Mail,
  newsletter: Mail,
  analytics: BarChart3,
  "posting-analytics": LineChart,
  "web-analytics": Globe,
  settings: Settings,
  help: HelpCircle,
};

function firstNameFrom(name: string | null, email: string | null) {
  const source = (name || "").trim() || (email || "").split("@")[0] || "Admin";
  return source.split(/\s+/)[0] || "Admin";
}

function formatBadge(value?: number) {
  if (value == null || value <= 0) return null;
  if (value > 999) return `${Math.round(value / 100) / 10}k`;
  return String(value);
}

function AdminPanelInner({ email, name, role }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [counts, setCounts] = useState<Counts>({});
  const [search, setSearch] = useState("");

  const rawPage = searchParams.get("page");
  const page: AdminPageId = isAdminPageId(rawPage) ? rawPage : "overview";

  const displayName = (name || "").trim() || (email || "").split("@")[0] || "Admin";
  const firstName = firstNameFrom(name, email);
  const initials = useMemo(() => {
    const parts = displayName.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase();
    return (parts[0]?.slice(0, 2) || "DL").toUpperCase();
  }, [displayName]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        if (window.localStorage.getItem(SIDEBAR_KEY) === "1") setSidebarCollapsed(true);
      } catch {
        // ignore
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  function toggleSidebarCollapsed() {
    setSidebarCollapsed((current) => {
      const next = !current;
      try {
        window.localStorage.setItem(SIDEBAR_KEY, next ? "1" : "0");
      } catch {
        // ignore
      }
      return next;
    });
  }

  async function logout() {
    await fetch("/api/me", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "logout" }),
    });
    router.replace("/login?next=/admin");
    router.refresh();
  }

  const title = adminPageTitle(page);

  return (
    <div className="blog-dash blog-dash--app">
      <div
        className="blog-dash__shell"
        style={
          {
            ["--blog-sidebar-width" as string]: sidebarCollapsed ? "72px" : "220px",
          } as React.CSSProperties
        }
      >
        {mobileOpen ? (
          <button
            type="button"
            className="blog-dash__overlay"
            aria-label="Close menu"
            onClick={() => setMobileOpen(false)}
          />
        ) : null}

        <aside
          className={`blog-dash__sidebar${sidebarCollapsed ? " blog-dash__sidebar--collapsed" : ""}${
            mobileOpen ? " blog-dash__sidebar--open" : ""
          }`}
          aria-label="Dishly Admin navigation"
        >
          <div className="blog-dash__sidebar-brand">
            <span
              className="grid h-9 w-9 place-items-center rounded-full text-sm font-bold text-white"
              style={{ background: "var(--fitdog-orange)" }}
              aria-hidden
            >
              D
            </span>
            {!sidebarCollapsed ? (
              <p className="blog-dash__wordmark">
                Dish<span>ly</span>
              </p>
            ) : null}
          </div>

          <nav className="blog-dash__nav">
            {ADMIN_DASHBOARD_NAV.map((section) => (
              <div key={section.id} className="blog-dash__nav-section">
                {!sidebarCollapsed ? <p className="blog-dash__nav-label">{section.label}</p> : null}
                {section.items.map((item) => {
                  const href = `${ADMIN_APP_PATH}?page=${item.id}`;
                  const active = page === item.id;
                  const Icon = ICONS[item.id] || LayoutDashboard;
                  const badge = item.badgeKey ? formatBadge(counts[item.badgeKey]) : null;
                  return (
                    <Link
                      key={item.id}
                      href={href}
                      className={`blog-dash__nav-link${active ? " blog-dash__nav-link--active" : ""}${
                        item.mobileHidden ? " blog-dash__nav-link--mobile-hidden" : ""
                      }`}
                      title={sidebarCollapsed ? item.label : undefined}
                      onClick={() => setMobileOpen(false)}
                    >
                      <Icon className="blog-dash__nav-icon" aria-hidden />
                      {!sidebarCollapsed ? <span className="truncate">{item.label}</span> : null}
                      {!sidebarCollapsed && badge ? <span className="blog-dash__badge">{badge}</span> : null}
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>

          <div className="blog-dash__sidebar-footer">
            <a href="/blog" target="_blank" rel="noreferrer" className="blog-dash__public-btn" title="View public blog">
              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              {!sidebarCollapsed ? "View Public Blog" : null}
            </a>
            <button
              type="button"
              className="blog-dash__collapse-btn"
              onClick={toggleSidebarCollapsed}
              aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
          </div>
        </aside>

        <div className="blog-dash__main">
          <header className="blog-dash__topbar">
            <div className="blog-dash__topbar-left">
              <button
                type="button"
                className="blog-dash__icon-btn lg:hidden"
                onClick={() => setMobileOpen(true)}
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="min-w-0">
                <p className="blog-dash__app-brand">Dishly Admin</p>
                <h1 className="blog-dash__title">
                  <span className="blog-dash__title-mobile">{title}</span>
                  <span className="blog-dash__title-desktop">Admin Panel</span>
                </h1>
                <p className="blog-dash__welcome">Welcome back, {firstName}</p>
              </div>
            </div>

            <div className="blog-dash__search">
              <Search className="blog-dash__search-icon" aria-hidden />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search users, articles, campaigns…"
                autoComplete="off"
              />
              <span className="blog-dash__kbd" aria-hidden>
                ⌘ K
              </span>
            </div>

            <div className="blog-dash__topbar-right">
              <Link href={`${ADMIN_APP_PATH}?page=activity`} className="blog-dash__icon-btn" aria-label="Activity">
                <Bell className="h-4 w-4" />
              </Link>
              <Link href={`${ADMIN_APP_PATH}?page=help`} className="blog-dash__icon-btn" aria-label="Help">
                <HelpCircle className="h-4 w-4" />
              </Link>
              <div className="relative">
                <button
                  type="button"
                  className="blog-dash__user"
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                  onClick={() => setMenuOpen((v) => !v)}
                >
                  <span className="blog-dash__avatar">{initials}</span>
                  <span className="blog-dash__user-meta text-left">
                    <span className="blog-dash__user-name block">{displayName}</span>
                    <span className="blog-dash__user-role block">{role === "admin" ? "Admin" : role}</span>
                  </span>
                  <ChevronDown className="h-3.5 w-3.5" aria-hidden style={{ color: "var(--fitdog-muted)" }} />
                </button>
                {menuOpen ? (
                  <div
                    role="menu"
                    className="absolute right-0 top-[46px] z-50 min-w-[180px] rounded-xl border bg-white p-1 shadow-lg"
                    style={{ borderColor: "var(--fitdog-border)" }}
                  >
                    <Link
                      href="/tonight"
                      role="menuitem"
                      className="block rounded-lg px-3 py-2 text-sm hover:bg-slate-50"
                      onClick={() => setMenuOpen(false)}
                    >
                      Open app
                    </Link>
                    <Link
                      href={`${ADMIN_APP_PATH}?page=settings`}
                      role="menuitem"
                      className="block rounded-lg px-3 py-2 text-sm hover:bg-slate-50"
                      onClick={() => setMenuOpen(false)}
                    >
                      Admin settings
                    </Link>
                    <button
                      type="button"
                      role="menuitem"
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                      onClick={() => {
                        setMenuOpen(false);
                        void logout();
                      }}
                    >
                      <X className="h-3.5 w-3.5" /> Sign out
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </header>

          <div className="blog-dash__content">
            {isGeneratorPage(page) ? (
              <div className="blog-dash__gen-switch" aria-label="Choose generator">
                {ADMIN_GENERATOR_TABS.map((tab) => {
                  const Icon = ICONS[tab.id] || Wand2;
                  const active = page === tab.id;
                  return (
                    <Link
                      key={tab.id}
                      href={`${ADMIN_APP_PATH}?page=${tab.id}`}
                      aria-current={active ? "page" : undefined}
                      className={`blog-dash__gen-switch-item${active ? " is-active" : ""}`}
                    >
                      <Icon className="h-4 w-4" aria-hidden />
                      {tab.label} Generator
                    </Link>
                  );
                })}
              </div>
            ) : null}
            <AdminWorkspace page={page} searchQuery={search} onCounts={setCounts} />
          </div>
        </div>
      </div>

      <nav className="blog-mobile-tabbar" aria-label="Admin mobile tabs">
        {ADMIN_MOBILE_TABS.map((id) => {
          const Icon = ICONS[id] || LayoutDashboard;
          const active = page === id;
          return (
            <Link
              key={id}
              href={`${ADMIN_APP_PATH}?page=${id}`}
              aria-current={active ? "page" : undefined}
              className={`blog-mobile-tabbar__item${active ? " is-active" : ""}`}
            >
              <Icon className="h-4 w-4" aria-hidden />
              <span>{adminMobileTabLabel(id)}</span>
            </Link>
          );
        })}
        <button
          type="button"
          className="blog-mobile-tabbar__item"
          onClick={() => setMobileOpen(true)}
          aria-label="More admin sections"
        >
          <Menu className="h-4 w-4" aria-hidden />
          <span>More</span>
        </button>
      </nav>
    </div>
  );
}

export function AdminPanelClient(props: Props) {
  return (
    <Suspense
      fallback={
        <div className="blog-dash" style={{ padding: 40 }}>
          <div className="blog-dash-skel" style={{ height: 28, width: 220, marginBottom: 16 }} />
          <div className="blog-dash-skel" style={{ height: 160, width: "100%" }} />
        </div>
      }
    >
      <AdminPanelInner {...props} />
    </Suspense>
  );
}
