"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  Loader2,
  RefreshCw,
  Send,
  Sparkles,
  Wand2,
} from "lucide-react";
import { ADMIN_APP_PATH, type AdminNavBadgeKey, type AdminPageId } from "@/components/admin/admin-nav";

type Counts = Partial<Record<AdminNavBadgeKey, number>>;

type Props = {
  page: AdminPageId;
  searchQuery?: string;
  onCounts?: (counts: Counts) => void;
};

type OverviewData = {
  kpis: {
    users: number;
    guests: number;
    active7d: number;
    blogDrafts: number;
    blogScheduled: number;
    blogPublished: number;
    socialScheduled: number;
    campaigns: number;
    scans24h: number;
    cooks24h: number;
  };
  recentActivity: Array<{ id: string; type: string; path?: string | null; createdAt: string; userEmail?: string | null }>;
  counts: Counts;
};

type AdminUser = {
  id: string;
  email: string | null;
  name: string | null;
  role: string;
  guest: boolean;
  lastSeenAt: string | null;
  createdAt: string;
};

type BlogPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  bodyMarkdown: string;
  status: string;
  category?: string | null;
  scheduledFor?: string | null;
  publishedAt?: string | null;
  updatedAt: string;
};

type SocialPost = {
  id: string;
  platform: string;
  caption: string;
  status: string;
  scheduledFor?: string | null;
  publishedAt?: string | null;
  linkedBlogId?: string | null;
  createdAt: string;
};

type Campaign = {
  id: string;
  name: string;
  subject: string;
  previewText: string;
  bodyHtml: string;
  status: string;
  scheduledFor?: string | null;
  sentAt?: string | null;
  stats?: { sent?: number; opened?: number; clicked?: number };
};

type CalendarEvent = {
  id: string;
  kind: "blog" | "social" | "campaign";
  title: string;
  status: string;
  at: string;
};

type ActivityRow = {
  id: string;
  type: string;
  path?: string | null;
  createdAt: string;
  userId?: string | null;
  userEmail?: string | null;
  meta?: Record<string, unknown>;
};

type AnalyticsData = {
  totals: Record<string, number>;
  series: Array<{ date: string; events: number; sessions: number }>;
  topEvents: Array<{ event: string; count: number }>;
  topPaths: Array<{ path: string; count: number }>;
};

async function adminFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { error?: string }).error || `Request failed (${res.status})`);
  return json as T;
}

function statusClass(status: string) {
  const key = status.toLowerCase();
  if (key.includes("publish") || key === "sent") return "blog-dash-status blog-dash-status--published";
  if (key.includes("schedul")) return "blog-dash-status blog-dash-status--scheduled";
  if (key.includes("approv")) return "blog-dash-status blog-dash-status--approved";
  if (key.includes("review")) return "blog-dash-status blog-dash-status--review";
  if (key.includes("fail") || key.includes("cancel")) return "blog-dash-status blog-dash-status--failed";
  if (key === "admin") return "blog-dash-status blog-dash-status--admin";
  if (key === "guest") return "blog-dash-status blog-dash-status--guest";
  if (key === "user") return "blog-dash-status blog-dash-status--user";
  return "blog-dash-status blog-dash-status--draft";
}

function fmtDate(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function KpiCard({
  label,
  value,
  delta,
  down,
}: {
  label: string;
  value: string | number;
  delta?: string;
  down?: boolean;
}) {
  return (
    <div className="blog-dash-card blog-dash-kpi">
      <div className="blog-dash-kpi__icon" style={{ background: "var(--fitdog-orange-soft)", color: "var(--fitdog-orange)" }}>
        {down ? <ArrowDownRight className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
      </div>
      <p className="blog-dash-kpi__label">{label}</p>
      <p className="blog-dash-kpi__value">{value}</p>
      {delta ? <p className={`blog-dash-kpi__delta${down ? " blog-dash-kpi__delta--down" : ""}`}>{delta}</p> : null}
    </div>
  );
}

function PanelHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="text-xl font-bold tracking-tight" style={{ color: "var(--fitdog-heading)" }}>
          {title}
        </h2>
        {subtitle ? (
          <p className="mt-1 text-sm" style={{ color: "var(--fitdog-muted)" }}>
            {subtitle}
          </p>
        ) : null}
      </div>
      {actions}
    </div>
  );
}

function Alert({ kind, children }: { kind: "ok" | "err" | "info"; children: React.ReactNode }) {
  return <div className={`blog-dash-alert blog-dash-alert--${kind}`}>{children}</div>;
}

function LoadingBlock() {
  return (
    <div className="blog-dash-empty flex items-center justify-center gap-2">
      <Loader2 className="h-4 w-4 animate-spin" /> Loading…
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Overview                                                            */
/* ------------------------------------------------------------------ */

function OverviewPanel({ onCounts }: { onCounts?: (c: Counts) => void }) {
  const [data, setData] = useState<OverviewData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const json = await adminFetch<OverviewData>("/api/admin/overview");
      setData(json);
      onCounts?.(json.counts || {});
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load overview");
    } finally {
      setLoading(false);
    }
  }, [onCounts]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading && !data) return <LoadingBlock />;
  if (error) return <Alert kind="err">{error}</Alert>;
  if (!data) return null;

  const k = data.kpis;
  return (
    <div className="blog-dash-panel blog-dash-panel--wide">
      <PanelHeader
        title="Dishly Overview"
        subtitle="Users, content pipeline, and recent kitchen activity."
        actions={
          <button type="button" className="blog-dash-toolbar-btn" onClick={() => void load()}>
            <RefreshCw className="mr-1 inline h-3.5 w-3.5" /> Refresh
          </button>
        }
      />
      <div className="blog-dash-kpi-grid mb-4">
        <KpiCard label="Registered users" value={k.users} delta={`${k.guests} guests`} />
        <KpiCard label="Active (7d)" value={k.active7d} delta="last seen" />
        <KpiCard label="Published posts" value={k.blogPublished} delta={`${k.blogDrafts} drafts`} />
        <KpiCard label="Scheduled content" value={k.blogScheduled + k.socialScheduled} delta={`${k.campaigns} campaigns`} />
      </div>
      <div className="blog-dash-kpi-grid mb-4">
        <KpiCard label="Scans (24h)" value={k.scans24h} />
        <KpiCard label="Cooks (24h)" value={k.cooks24h} />
        <KpiCard label="Social queue" value={k.socialScheduled} />
        <KpiCard label="Email campaigns" value={k.campaigns} />
      </div>
      <div className="blog-dash-split">
        <div className="blog-dash-card" style={{ padding: 16 }}>
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wide" style={{ color: "var(--fitdog-muted)" }}>
            Recent activity
          </h3>
          <table className="blog-dash-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>User</th>
                <th>Path</th>
                <th>When</th>
              </tr>
            </thead>
            <tbody>
              {data.recentActivity.length === 0 ? (
                <tr>
                  <td colSpan={4} className="blog-dash-empty">
                    No activity yet.
                  </td>
                </tr>
              ) : (
                data.recentActivity.map((row) => (
                  <tr key={row.id}>
                    <td>{row.type}</td>
                    <td>{row.userEmail || "—"}</td>
                    <td>{row.path || "—"}</td>
                    <td>{fmtDate(row.createdAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="blog-dash-side-card">
          <h3 className="mb-2 text-sm font-bold">Quick actions</h3>
          <div className="flex flex-col gap-2">
            <Link href={`${ADMIN_APP_PATH}?page=generate`} className="blog-dash-toolbar-btn blog-dash-toolbar-btn--primary text-center">
              Generate blog draft
            </Link>
            <Link href={`${ADMIN_APP_PATH}?page=social-generator`} className="blog-dash-toolbar-btn text-center">
              Social caption
            </Link>
            <Link href={`${ADMIN_APP_PATH}?page=campaigns`} className="blog-dash-toolbar-btn text-center">
              New email campaign
            </Link>
            <Link href={`${ADMIN_APP_PATH}?page=users`} className="blog-dash-toolbar-btn text-center">
              Manage users
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Users                                                               */
/* ------------------------------------------------------------------ */

function UsersPanel({ searchQuery = "" }: { searchQuery?: string }) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [q, setQ] = useState(searchQuery);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [tempPassword, setTempPassword] = useState<{ email: string | null; password: string } | null>(null);
  const [passwordDrafts, setPasswordDrafts] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    setQ(searchQuery);
  }, [searchQuery]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const json = await adminFetch<{ users: AdminUser[] }>(
        `/api/admin/users?q=${encodeURIComponent(q.trim())}`,
      );
      setUsers(json.users || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, [q]);

  useEffect(() => {
    const t = window.setTimeout(() => void load(), 200);
    return () => window.clearTimeout(t);
  }, [load]);

  async function setPassword(userId: string) {
    const password = passwordDrafts[userId]?.trim() || "";
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setBusyId(userId);
    setError(null);
    setMessage(null);
    setTempPassword(null);
    try {
      await adminFetch("/api/admin/users", {
        method: "POST",
        body: JSON.stringify({ action: "setPassword", userId, password }),
      });
      setMessage("Password updated.");
      setPasswordDrafts((prev) => ({ ...prev, [userId]: "" }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to set password");
    } finally {
      setBusyId(null);
    }
  }

  async function resetTemp(user: AdminUser) {
    setBusyId(user.id);
    setError(null);
    setMessage(null);
    try {
      const json = await adminFetch<{ temporaryPassword: string }>("/api/admin/users", {
        method: "POST",
        body: JSON.stringify({ action: "resetTemporaryPassword", userId: user.id }),
      });
      setTempPassword({ email: user.email, password: json.temporaryPassword });
      setMessage("Temporary password generated — copy it now; it will not be shown again.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset password");
    } finally {
      setBusyId(null);
    }
  }

  async function setRole(userId: string, role: "user" | "admin") {
    setBusyId(userId);
    setError(null);
    try {
      await adminFetch("/api/admin/users", {
        method: "POST",
        body: JSON.stringify({ action: "setRole", userId, role }),
      });
      setMessage(`Role set to ${role}.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to set role");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="blog-dash-panel blog-dash-panel--wide">
      <PanelHeader title="Users" subtitle="Search accounts, set passwords, and manage admin roles." />
      {error ? <Alert kind="err">{error}</Alert> : null}
      {message ? <Alert kind="ok">{message}</Alert> : null}
      {tempPassword ? (
        <Alert kind="info">
          Temporary password for <strong>{tempPassword.email || "user"}</strong>:
          <div className="blog-dash-temp-pw mt-2">{tempPassword.password}</div>
        </Alert>
      ) : null}
      <div className="blog-dash-filters">
        <label>
          <span className="blog-dash-label">Search</span>
          <input
            className="blog-dash-input"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Email or name…"
          />
        </label>
        <button type="button" className="blog-dash-toolbar-btn" onClick={() => void load()}>
          Refresh
        </button>
      </div>
      {loading ? (
        <LoadingBlock />
      ) : (
        <div className="overflow-x-auto">
          <table className="blog-dash-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Name</th>
                <th>Role</th>
                <th>Last seen</th>
                <th>Password</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="blog-dash-empty">
                    No users match.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div className="font-semibold">{user.email || "—"}</div>
                      {user.guest ? <span className={statusClass("guest")}>Guest</span> : null}
                    </td>
                    <td>{user.name || "—"}</td>
                    <td>
                      <span className={statusClass(user.role)}>{user.role}</span>
                    </td>
                    <td>{fmtDate(user.lastSeenAt)}</td>
                    <td style={{ minWidth: 180 }}>
                      <input
                        className="blog-dash-input"
                        type="password"
                        placeholder="New password"
                        value={passwordDrafts[user.id] || ""}
                        onChange={(e) =>
                          setPasswordDrafts((prev) => ({ ...prev, [user.id]: e.target.value }))
                        }
                      />
                    </td>
                    <td>
                      <div className="blog-dash-inline-actions">
                        <button
                          type="button"
                          className="blog-dash-toolbar-btn blog-dash-toolbar-btn--primary"
                          disabled={busyId === user.id}
                          onClick={() => void setPassword(user.id)}
                        >
                          Set PW
                        </button>
                        <button
                          type="button"
                          className="blog-dash-toolbar-btn"
                          disabled={busyId === user.id}
                          onClick={() => void resetTemp(user)}
                        >
                          Temp PW
                        </button>
                        {user.role === "admin" ? (
                          <button
                            type="button"
                            className="blog-dash-toolbar-btn"
                            disabled={busyId === user.id || user.guest}
                            onClick={() => void setRole(user.id, "user")}
                          >
                            Demote
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="blog-dash-toolbar-btn"
                            disabled={busyId === user.id || user.guest || !user.email}
                            onClick={() => void setRole(user.id, "admin")}
                          >
                            Make admin
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Activity / Reports                                                  */
/* ------------------------------------------------------------------ */

function ActivityPanel() {
  const [rows, setRows] = useState<ActivityRow[]>([]);
  const [type, setType] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = type ? `?type=${encodeURIComponent(type)}` : "";
      const json = await adminFetch<{ events: ActivityRow[] }>(`/api/admin/activity${qs}`);
      setRows(json.events || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load activity");
    } finally {
      setLoading(false);
    }
  }, [type]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="blog-dash-panel blog-dash-panel--wide">
      <PanelHeader title="Activity feed" subtitle="Recent product and admin events." />
      {error ? <Alert kind="err">{error}</Alert> : null}
      <div className="blog-dash-filters">
        <label>
          <span className="blog-dash-label">Filter type</span>
          <input className="blog-dash-input" value={type} onChange={(e) => setType(e.target.value)} placeholder="session_ping, cook_start…" />
        </label>
        <button type="button" className="blog-dash-toolbar-btn" onClick={() => void load()}>
          Refresh
        </button>
      </div>
      {loading ? (
        <LoadingBlock />
      ) : (
        <table className="blog-dash-table">
          <thead>
            <tr>
              <th>When</th>
              <th>Type</th>
              <th>User</th>
              <th>Path</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="blog-dash-empty">
                  No events.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id}>
                  <td>{fmtDate(row.createdAt)}</td>
                  <td>{row.type}</td>
                  <td>{row.userEmail || row.userId || "—"}</td>
                  <td>{row.path || "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}

function ReportsPanel() {
  return (
    <div className="blog-dash-panel">
      <PanelHeader
        title="Reports"
        subtitle="Export-ready snapshots for growth and ops reviews."
        actions={
          <Link href={`${ADMIN_APP_PATH}?page=analytics`} className="blog-dash-toolbar-btn blog-dash-toolbar-btn--primary">
            Open analytics
          </Link>
        }
      />
      <div className="blog-dash-form-panel">
        <p style={{ color: "var(--fitdog-muted)", margin: 0 }}>
          Pull live KPIs from Overview and Analytics. Use Activity for audit trails and Campaigns for email send history.
        </p>
        <div className="blog-dash-inline-actions">
          <Link href={`${ADMIN_APP_PATH}?page=overview`} className="blog-dash-toolbar-btn">
            Overview KPIs
          </Link>
          <Link href={`${ADMIN_APP_PATH}?page=activity`} className="blog-dash-toolbar-btn">
            Activity log
          </Link>
          <Link href={`${ADMIN_APP_PATH}?page=campaigns`} className="blog-dash-toolbar-btn">
            Campaign stats
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Blog list / generator                                               */
/* ------------------------------------------------------------------ */

function BlogListPanel({
  title,
  statusFilter,
}: {
  title: string;
  statusFilter?: string;
}) {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = statusFilter ? `?status=${encodeURIComponent(statusFilter)}` : "";
      const json = await adminFetch<{ posts: BlogPost[] }>(`/api/admin/blog${qs}`);
      setPosts(json.posts || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load articles");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  async function updateStatus(id: string, status: string, scheduledFor?: string) {
    setBusyId(id);
    setError(null);
    setMessage(null);
    try {
      await adminFetch("/api/admin/blog", {
        method: "POST",
        body: JSON.stringify({ action: "updateStatus", id, status, scheduledFor }),
      });
      setMessage(`Updated to ${status}.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="blog-dash-panel blog-dash-panel--wide">
      <PanelHeader
        title={title}
        subtitle="Dishly blog pipeline."
        actions={
          <Link href={`${ADMIN_APP_PATH}?page=generate`} className="blog-dash-toolbar-btn blog-dash-toolbar-btn--primary">
            <Wand2 className="mr-1 inline h-3.5 w-3.5" /> Generate
          </Link>
        }
      />
      {error ? <Alert kind="err">{error}</Alert> : null}
      {message ? <Alert kind="ok">{message}</Alert> : null}
      {loading ? (
        <LoadingBlock />
      ) : (
        <table className="blog-dash-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Status</th>
              <th>Schedule</th>
              <th>Updated</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {posts.length === 0 ? (
              <tr>
                <td colSpan={5} className="blog-dash-empty">
                  No articles yet.
                </td>
              </tr>
            ) : (
              posts.map((post) => (
                <tr key={post.id}>
                  <td>
                    <div className="font-semibold">{post.title}</div>
                    <div className="text-xs" style={{ color: "var(--fitdog-muted)" }}>
                      /{post.slug}
                    </div>
                  </td>
                  <td>
                    <span className={statusClass(post.status)}>{post.status}</span>
                  </td>
                  <td>{fmtDate(post.scheduledFor || post.publishedAt)}</td>
                  <td>{fmtDate(post.updatedAt)}</td>
                  <td>
                    <div className="blog-dash-inline-actions">
                      {post.status !== "published" ? (
                        <button
                          type="button"
                          className="blog-dash-toolbar-btn blog-dash-toolbar-btn--success"
                          disabled={busyId === post.id}
                          onClick={() => void updateStatus(post.id, "published")}
                        >
                          Publish
                        </button>
                      ) : null}
                      {post.status !== "scheduled" ? (
                        <button
                          type="button"
                          className="blog-dash-toolbar-btn"
                          disabled={busyId === post.id}
                          onClick={() => {
                            const when = window.prompt("Schedule ISO datetime", new Date(Date.now() + 86400000).toISOString().slice(0, 16));
                            if (when) void updateStatus(post.id, "scheduled", new Date(when).toISOString());
                          }}
                        >
                          Schedule
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className="blog-dash-toolbar-btn"
                        disabled={busyId === post.id}
                        onClick={() => void updateStatus(post.id, "draft")}
                      >
                        Draft
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}

function BlogGeneratePanel() {
  const [topic, setTopic] = useState("");
  const [tone, setTone] = useState("warm_practical");
  const [length, setLength] = useState("medium");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [postId, setPostId] = useState<string | null>(null);
  const [scheduledFor, setScheduledFor] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function generate() {
    if (!topic.trim()) {
      setError("Enter a topic.");
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const json = await adminFetch<{ post: BlogPost }>("/api/admin/blog", {
        method: "POST",
        body: JSON.stringify({ action: "generate", topic, tone, length }),
      });
      setPostId(json.post.id);
      setTitle(json.post.title);
      setBody(json.post.bodyMarkdown);
      setMessage("Draft generated. Edit, then schedule or publish.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setBusy(false);
    }
  }

  async function saveDraft() {
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const json = await adminFetch<{ post: BlogPost }>("/api/admin/blog", {
        method: "POST",
        body: JSON.stringify({
          action: postId ? "update" : "create",
          id: postId || undefined,
          title,
          bodyMarkdown: body,
          status: "draft",
        }),
      });
      setPostId(json.post.id);
      setMessage("Draft saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function publishOrSchedule(mode: "published" | "scheduled") {
    if (!postId) {
      await saveDraft();
    }
    const id = postId;
    if (!id && !title.trim()) return;
    setBusy(true);
    setError(null);
    try {
      let resolvedId = id;
      if (!resolvedId) {
        const created = await adminFetch<{ post: BlogPost }>("/api/admin/blog", {
          method: "POST",
          body: JSON.stringify({ action: "create", title, bodyMarkdown: body, status: "draft" }),
        });
        resolvedId = created.post.id;
        setPostId(resolvedId);
      } else {
        await adminFetch("/api/admin/blog", {
          method: "POST",
          body: JSON.stringify({ action: "update", id: resolvedId, title, bodyMarkdown: body }),
        });
      }
      await adminFetch("/api/admin/blog", {
        method: "POST",
        body: JSON.stringify({
          action: mode === "published" ? "publish" : "updateStatus",
          id: resolvedId,
          status: mode,
          scheduledFor: mode === "scheduled" ? new Date(scheduledFor || Date.now() + 86400000).toISOString() : undefined,
        }),
      });
      setMessage(mode === "published" ? "Published." : "Scheduled.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="blog-dash-panel blog-dash-panel--wide">
      <PanelHeader title="Blog Generator" subtitle="Topic → AI draft → edit markdown → schedule or publish." />
      {error ? <Alert kind="err">{error}</Alert> : null}
      {message ? <Alert kind="ok">{message}</Alert> : null}
      <div className="blog-dash-split">
        <div className="blog-dash-form-panel">
          <label>
            <span className="blog-dash-label">Topic</span>
            <input
              className="blog-dash-input"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. 5 ways to use leftover rice tonight"
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label>
              <span className="blog-dash-label">Tone</span>
              <select className="blog-dash-select" value={tone} onChange={(e) => setTone(e.target.value)}>
                <option value="warm_practical">Warm & practical</option>
                <option value="cheerful">Cheerful</option>
                <option value="expert">Expert / chef tips</option>
                <option value="busy_parent">Busy weeknight</option>
              </select>
            </label>
            <label>
              <span className="blog-dash-label">Length</span>
              <select className="blog-dash-select" value={length} onChange={(e) => setLength(e.target.value)}>
                <option value="short">Short</option>
                <option value="medium">Medium</option>
                <option value="long">Long</option>
              </select>
            </label>
          </div>
          <button
            type="button"
            className="blog-dash-toolbar-btn blog-dash-toolbar-btn--primary"
            disabled={busy}
            onClick={() => void generate()}
          >
            {busy ? <Loader2 className="mr-1 inline h-4 w-4 animate-spin" /> : <Sparkles className="mr-1 inline h-4 w-4" />}
            Generate draft
          </button>
          <label>
            <span className="blog-dash-label">Title</span>
            <input className="blog-dash-input blog-dash-input--title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </label>
          <label>
            <span className="blog-dash-label">Markdown body</span>
            <textarea
              className="blog-dash-textarea blog-dash-textarea--body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="## Heading&#10;&#10;Write or edit the article…"
            />
          </label>
          <label>
            <span className="blog-dash-label">Schedule for</span>
            <input
              className="blog-dash-input"
              type="datetime-local"
              value={scheduledFor}
              onChange={(e) => setScheduledFor(e.target.value)}
            />
          </label>
          <div className="blog-dash-inline-actions">
            <button type="button" className="blog-dash-toolbar-btn" disabled={busy} onClick={() => void saveDraft()}>
              Save draft
            </button>
            <button type="button" className="blog-dash-toolbar-btn" disabled={busy} onClick={() => void publishOrSchedule("scheduled")}>
              Schedule
            </button>
            <button
              type="button"
              className="blog-dash-toolbar-btn blog-dash-toolbar-btn--success"
              disabled={busy}
              onClick={() => void publishOrSchedule("published")}
            >
              Publish now
            </button>
          </div>
        </div>
        <div className="blog-dash-side-card">
          <h3 className="mb-2 font-bold">Workflow</h3>
          <ol className="m-0 list-decimal space-y-2 pl-4 text-sm" style={{ color: "var(--fitdog-muted)" }}>
            <li>Enter a cooking or kitchen topic.</li>
            <li>Generate an AI draft in Dishly voice.</li>
            <li>Edit the markdown, then save.</li>
            <li>Schedule for the calendar or publish live.</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Social                                                              */
/* ------------------------------------------------------------------ */

function SocialGeneratorPanel() {
  const [platform, setPlatform] = useState("instagram");
  const [topic, setTopic] = useState("");
  const [blogId, setBlogId] = useState("");
  const [caption, setCaption] = useState("");
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [scheduledFor, setScheduledFor] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const json = await adminFetch<{ posts: SocialPost[] }>("/api/admin/social");
      setPosts(json.posts || []);
    } catch {
      // ignore list errors in side panel
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function generate() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const json = await adminFetch<{ post: SocialPost }>("/api/admin/social", {
        method: "POST",
        body: JSON.stringify({ action: "generate", platform, topic, linkedBlogId: blogId || undefined }),
      });
      setCaption(json.post.caption);
      setMessage("Caption generated.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generate failed");
    } finally {
      setBusy(false);
    }
  }

  async function schedule() {
    if (!caption.trim()) {
      setError("Generate or write a caption first.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await adminFetch("/api/admin/social", {
        method: "POST",
        body: JSON.stringify({
          action: "schedule",
          platform,
          caption,
          linkedBlogId: blogId || undefined,
          scheduledFor: scheduledFor ? new Date(scheduledFor).toISOString() : new Date(Date.now() + 3600000).toISOString(),
        }),
      });
      setMessage("Scheduled on calendar.");
      setCaption("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Schedule failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="blog-dash-panel blog-dash-panel--wide">
      <PanelHeader title="Social Media Generator" subtitle="Captions from a topic or blog post, then schedule." />
      {error ? <Alert kind="err">{error}</Alert> : null}
      {message ? <Alert kind="ok">{message}</Alert> : null}
      <div className="blog-dash-split">
        <div className="blog-dash-form-panel">
          <label>
            <span className="blog-dash-label">Platform</span>
            <select className="blog-dash-select" value={platform} onChange={(e) => setPlatform(e.target.value)}>
              <option value="instagram">Instagram</option>
              <option value="tiktok">TikTok</option>
              <option value="x">X / Twitter</option>
              <option value="facebook">Facebook</option>
              <option value="threads">Threads</option>
              <option value="linkedin">LinkedIn</option>
            </select>
          </label>
          <label>
            <span className="blog-dash-label">Topic</span>
            <input className="blog-dash-input" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Leftover chicken bowls" />
          </label>
          <label>
            <span className="blog-dash-label">Linked blog post ID (optional)</span>
            <input className="blog-dash-input" value={blogId} onChange={(e) => setBlogId(e.target.value)} placeholder="cuid…" />
          </label>
          <button type="button" className="blog-dash-toolbar-btn blog-dash-toolbar-btn--primary" disabled={busy} onClick={() => void generate()}>
            Generate caption
          </button>
          <label>
            <span className="blog-dash-label">Caption</span>
            <textarea className="blog-dash-textarea" value={caption} onChange={(e) => setCaption(e.target.value)} />
          </label>
          <label>
            <span className="blog-dash-label">Schedule</span>
            <input className="blog-dash-input" type="datetime-local" value={scheduledFor} onChange={(e) => setScheduledFor(e.target.value)} />
          </label>
          <button type="button" className="blog-dash-toolbar-btn blog-dash-toolbar-btn--success" disabled={busy} onClick={() => void schedule()}>
            <CalendarDays className="mr-1 inline h-4 w-4" /> Schedule post
          </button>
        </div>
        <div className="blog-dash-side-card">
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wide" style={{ color: "var(--fitdog-muted)" }}>
            Recent social
          </h3>
          <div className="flex flex-col gap-2">
            {posts.slice(0, 8).map((post) => (
              <div key={post.id} className="rounded-lg border p-2 text-sm" style={{ borderColor: "var(--fitdog-border)" }}>
                <div className="mb-1 flex items-center justify-between gap-2">
                  <strong className="capitalize">{post.platform}</strong>
                  <span className={statusClass(post.status)}>{post.status}</span>
                </div>
                <p className="m-0 line-clamp-3" style={{ color: "var(--fitdog-muted)" }}>
                  {post.caption}
                </p>
              </div>
            ))}
            {posts.length === 0 ? <p className="blog-dash-empty">No social posts yet.</p> : null}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Campaigns / Newsletter                                              */
/* ------------------------------------------------------------------ */

function CampaignsPanel() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [previewText, setPreviewText] = useState("");
  const [bodyHtml, setBodyHtml] = useState("<p>Hey friend — here&apos;s what&apos;s cooking this week.</p>");
  const [scheduledFor, setScheduledFor] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const json = await adminFetch<{ campaigns: Campaign[] }>("/api/admin/campaigns");
      setCampaigns(json.campaigns || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load campaigns");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function createCampaign() {
    setBusy(true);
    setError(null);
    try {
      await adminFetch("/api/admin/campaigns", {
        method: "POST",
        body: JSON.stringify({ action: "create", name, subject, previewText, bodyHtml }),
      });
      setMessage("Campaign created.");
      setName("");
      setSubject("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setBusy(false);
    }
  }

  async function schedule(id: string) {
    setBusy(true);
    setError(null);
    try {
      await adminFetch("/api/admin/campaigns", {
        method: "POST",
        body: JSON.stringify({
          action: "schedule",
          id,
          scheduledFor: scheduledFor ? new Date(scheduledFor).toISOString() : new Date(Date.now() + 86400000).toISOString(),
        }),
      });
      setMessage("Campaign scheduled.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Schedule failed");
    } finally {
      setBusy(false);
    }
  }

  async function sendNow(id: string) {
    setBusy(true);
    setError(null);
    try {
      await adminFetch("/api/admin/campaigns", {
        method: "POST",
        body: JSON.stringify({ action: "send", id }),
      });
      setMessage("Send queued / marked sent.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Send failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="blog-dash-panel blog-dash-panel--wide">
      <PanelHeader title="Email Campaigns" subtitle="Create, schedule, and send Dishly emails." />
      {error ? <Alert kind="err">{error}</Alert> : null}
      {message ? <Alert kind="ok">{message}</Alert> : null}
      <div className="blog-dash-split mb-4">
        <div className="blog-dash-form-panel">
          <label>
            <span className="blog-dash-label">Campaign name</span>
            <input className="blog-dash-input" value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label>
            <span className="blog-dash-label">Subject</span>
            <input className="blog-dash-input" value={subject} onChange={(e) => setSubject(e.target.value)} />
          </label>
          <label>
            <span className="blog-dash-label">Preview text</span>
            <input className="blog-dash-input" value={previewText} onChange={(e) => setPreviewText(e.target.value)} />
          </label>
          <label>
            <span className="blog-dash-label">HTML body</span>
            <textarea className="blog-dash-textarea" value={bodyHtml} onChange={(e) => setBodyHtml(e.target.value)} />
          </label>
          <label>
            <span className="blog-dash-label">Default schedule time</span>
            <input className="blog-dash-input" type="datetime-local" value={scheduledFor} onChange={(e) => setScheduledFor(e.target.value)} />
          </label>
          <button type="button" className="blog-dash-toolbar-btn blog-dash-toolbar-btn--primary" disabled={busy} onClick={() => void createCampaign()}>
            Create campaign
          </button>
        </div>
        <div className="blog-dash-side-card">
          <h3 className="mb-2 font-bold">Audience</h3>
          <p className="m-0 text-sm" style={{ color: "var(--fitdog-muted)" }}>
            Default segment: all registered users with email. Guests are excluded from campaigns.
          </p>
        </div>
      </div>
      <table className="blog-dash-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Subject</th>
            <th>Status</th>
            <th>Schedule / sent</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {campaigns.length === 0 ? (
            <tr>
              <td colSpan={5} className="blog-dash-empty">
                No campaigns yet.
              </td>
            </tr>
          ) : (
            campaigns.map((c) => (
              <tr key={c.id}>
                <td className="font-semibold">{c.name}</td>
                <td>{c.subject}</td>
                <td>
                  <span className={statusClass(c.status)}>{c.status}</span>
                </td>
                <td>{fmtDate(c.sentAt || c.scheduledFor)}</td>
                <td>
                  <div className="blog-dash-inline-actions">
                    <button type="button" className="blog-dash-toolbar-btn" disabled={busy || c.status === "sent"} onClick={() => void schedule(c.id)}>
                      Schedule
                    </button>
                    <button
                      type="button"
                      className="blog-dash-toolbar-btn blog-dash-toolbar-btn--success"
                      disabled={busy || c.status === "sent"}
                      onClick={() => void sendNow(c.id)}
                    >
                      <Send className="mr-1 inline h-3.5 w-3.5" /> Send
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function NewsletterPanel() {
  return (
    <div className="blog-dash-panel">
      <PanelHeader title="Newsletter" subtitle="Subscriber growth and weekly digest hooks." />
      <div className="blog-dash-form-panel">
        <p className="m-0 text-sm" style={{ color: "var(--fitdog-muted)" }}>
          Newsletter sends use Email Campaigns. Create a campaign with segment tips for weekly digests, then schedule it on the Content Calendar.
        </p>
        <Link href={`${ADMIN_APP_PATH}?page=campaigns`} className="blog-dash-toolbar-btn blog-dash-toolbar-btn--primary inline-flex w-fit">
          Open campaigns
        </Link>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Calendar                                                            */
/* ------------------------------------------------------------------ */

function CalendarPanel() {
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const start = new Date(year, month, 1).toISOString();
      const end = new Date(year, month + 1, 0, 23, 59, 59).toISOString();
      const json = await adminFetch<{ events: CalendarEvent[] }>(
        `/api/admin/calendar?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`,
      );
      setEvents(json.events || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load calendar");
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    void load();
  }, [load]);

  const byDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const event of events) {
      const key = new Date(event.at).toISOString().slice(0, 10);
      const list = map.get(key) || [];
      list.push(event);
      map.set(key, list);
    }
    return map;
  }, [events]);

  const cells = useMemo(() => {
    const firstDow = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevDays = new Date(year, month, 0).getDate();
    const rows: Array<{ date: Date; inMonth: boolean }> = [];
    for (let i = firstDow - 1; i >= 0; i--) {
      rows.push({ date: new Date(year, month - 1, prevDays - i), inMonth: false });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      rows.push({ date: new Date(year, month, d), inMonth: true });
    }
    while (rows.length % 7 !== 0) {
      const last = rows[rows.length - 1]!.date;
      rows.push({ date: new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1), inMonth: false });
    }
    return rows;
  }, [year, month]);

  const todayKey = new Date().toISOString().slice(0, 10);
  const monthLabel = cursor.toLocaleString(undefined, { month: "long", year: "numeric" });

  return (
    <div className="blog-dash-panel blog-dash-panel--wide">
      <PanelHeader title="Content Calendar" subtitle="Blog, social, and campaign schedule in one grid." />
      {error ? <Alert kind="err">{error}</Alert> : null}
      <div className="blog-dash-cal">
        <div className="blog-dash-cal__toolbar">
          <div className="blog-dash-cal__nav">
            <button
              type="button"
              className="blog-dash-toolbar-btn"
              onClick={() => setCursor(new Date(year, month - 1, 1))}
            >
              Prev
            </button>
            <h3 className="blog-dash-cal__month">{monthLabel}</h3>
            <button
              type="button"
              className="blog-dash-toolbar-btn"
              onClick={() => setCursor(new Date(year, month + 1, 1))}
            >
              Next
            </button>
            <button type="button" className="blog-dash-toolbar-btn" onClick={() => void load()}>
              Refresh
            </button>
          </div>
          <div className="blog-dash-cal__legend">
            <span>
              <span className="blog-dash-cal__dot blog-dash-cal__dot--blog" /> Blog
            </span>
            <span>
              <span className="blog-dash-cal__dot blog-dash-cal__dot--social" /> Social
            </span>
            <span>
              <span className="blog-dash-cal__dot blog-dash-cal__dot--campaign" /> Campaign
            </span>
          </div>
        </div>
        {loading ? (
          <LoadingBlock />
        ) : (
          <div className="blog-dash-cal__grid">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d} className="blog-dash-cal__dow">
                {d}
              </div>
            ))}
            {cells.map((cell) => {
              const key = cell.date.toISOString().slice(0, 10);
              const dayEvents = byDay.get(key) || [];
              return (
                <div
                  key={key + String(cell.inMonth)}
                  className={`blog-dash-cal__cell${cell.inMonth ? "" : " blog-dash-cal__cell--muted"}${
                    key === todayKey ? " blog-dash-cal__cell--today" : ""
                  }`}
                >
                  <div className="blog-dash-cal__daynum">{cell.date.getDate()}</div>
                  {dayEvents.slice(0, 4).map((event) => (
                    <button
                      key={event.id}
                      type="button"
                      className={`blog-dash-cal__event blog-dash-cal__event--${event.kind}`}
                      title={`${event.kind}: ${event.title} (${event.status})`}
                    >
                      {event.title}
                    </button>
                  ))}
                  {dayEvents.length > 4 ? (
                    <span className="text-[10px]" style={{ color: "var(--fitdog-muted)" }}>
                      +{dayEvents.length - 4} more
                    </span>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Analytics / Media / Settings / Help                                 */
/* ------------------------------------------------------------------ */

function AnalyticsPanel({ title }: { title: string }) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        const json = await adminFetch<AnalyticsData>("/api/admin/analytics");
        setData(json);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load analytics");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <LoadingBlock />;
  if (error) return <Alert kind="err">{error}</Alert>;
  if (!data) return null;

  return (
    <div className="blog-dash-panel blog-dash-panel--wide">
      <PanelHeader title={title} subtitle="Product and content performance signals." />
      <div className="blog-dash-kpi-grid mb-4">
        {Object.entries(data.totals).slice(0, 4).map(([label, value]) => (
          <KpiCard key={label} label={label} value={value} />
        ))}
      </div>
      <div className="blog-dash-split">
        <div className="blog-dash-card" style={{ padding: 16 }}>
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wide" style={{ color: "var(--fitdog-muted)" }}>
            Top events
          </h3>
          <table className="blog-dash-table">
            <thead>
              <tr>
                <th>Event</th>
                <th>Count</th>
              </tr>
            </thead>
            <tbody>
              {data.topEvents.map((row) => (
                <tr key={row.event}>
                  <td>{row.event}</td>
                  <td>{row.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="blog-dash-card" style={{ padding: 16 }}>
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wide" style={{ color: "var(--fitdog-muted)" }}>
            Top paths
          </h3>
          <table className="blog-dash-table">
            <thead>
              <tr>
                <th>Path</th>
                <th>Count</th>
              </tr>
            </thead>
            <tbody>
              {data.topPaths.map((row) => (
                <tr key={row.path}>
                  <td>{row.path}</td>
                  <td>{row.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function MediaPanel() {
  return (
    <div className="blog-dash-panel">
      <PanelHeader title="Media Library" subtitle="Recipe and blog imagery under /public/assets." />
      <div className="blog-dash-form-panel">
        <p className="m-0 text-sm" style={{ color: "var(--fitdog-muted)" }}>
          Serve images from <code>/assets/recipes</code> and landing media. Upload tooling can plug into this panel later; for now use repo assets and remote URLs on blog posts.
        </p>
        <div className="blog-dash-inline-actions">
          <Link href={`${ADMIN_APP_PATH}?page=generate`} className="blog-dash-toolbar-btn">
            Attach cover on generate
          </Link>
          <a href="/assets/kitchen-atmosphere.jpg" target="_blank" rel="noreferrer" className="blog-dash-toolbar-btn">
            Sample atmosphere
          </a>
        </div>
      </div>
    </div>
  );
}

function SettingsPanel() {
  return (
    <div className="blog-dash-panel">
      <PanelHeader title="Admin Settings" subtitle="Dishly ops preferences." />
      <div className="blog-dash-form-panel">
        <label>
          <span className="blog-dash-label">Default blog tone</span>
          <select className="blog-dash-select" defaultValue="warm_practical">
            <option value="warm_practical">Warm & practical</option>
            <option value="cheerful">Cheerful</option>
            <option value="expert">Expert</option>
          </select>
        </label>
        <label>
          <span className="blog-dash-label">Public blog path</span>
          <input className="blog-dash-input" defaultValue="/blog" readOnly />
        </label>
        <p className="m-0 text-sm" style={{ color: "var(--fitdog-muted)" }}>
          Brand accents: olive #4A5D3F, terracotta, espresso, cream. Primary CTA in this shell uses olive.
        </p>
      </div>
    </div>
  );
}

function HelpPanel() {
  return (
    <div className="blog-dash-panel">
      <PanelHeader title="How to use Admin" subtitle="Dishly content & growth ops." />
      <div className="blog-dash-form-panel">
        <ol className="m-0 list-decimal space-y-2 pl-5 text-sm" style={{ color: "var(--fitdog-body)" }}>
          <li>
            <strong>Overview</strong> — check KPIs and recent activity.
          </li>
          <li>
            <strong>Users</strong> — search accounts, set passwords, issue one-time temp passwords, promote admins.
          </li>
          <li>
            <strong>Blog Generator</strong> — topic → generate → edit markdown → schedule/publish.
          </li>
          <li>
            <strong>Social Generator</strong> — pick platform, generate caption, schedule to calendar.
          </li>
          <li>
            <strong>Campaigns</strong> — create email, schedule or send.
          </li>
          <li>
            <strong>Calendar</strong> — combined blog + social + campaign schedule.
          </li>
        </ol>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Workspace router                                                    */
/* ------------------------------------------------------------------ */

export function AdminWorkspace({ page, searchQuery, onCounts }: Props) {
  switch (page) {
    case "overview":
      return <OverviewPanel onCounts={onCounts} />;
    case "users":
      return <UsersPanel searchQuery={searchQuery} />;
    case "activity":
      return <ActivityPanel />;
    case "reports":
      return <ReportsPanel />;
    case "calendar":
      return <CalendarPanel />;
    case "articles":
      return <BlogListPanel title="All Articles" />;
    case "drafts":
      return <BlogListPanel title="Drafts" statusFilter="draft" />;
    case "scheduled":
      return <BlogListPanel title="Scheduled" statusFilter="scheduled" />;
    case "published":
      return <BlogListPanel title="Published" statusFilter="published" />;
    case "generate":
      return <BlogGeneratePanel />;
    case "social-generator":
      return <SocialGeneratorPanel />;
    case "media":
      return <MediaPanel />;
    case "campaigns":
      return <CampaignsPanel />;
    case "newsletter":
      return <NewsletterPanel />;
    case "analytics":
      return <AnalyticsPanel title="Product Analytics" />;
    case "posting-analytics":
      return <AnalyticsPanel title="Posting Analytics" />;
    case "web-analytics":
      return <AnalyticsPanel title="Web Analytics" />;
    case "settings":
      return <SettingsPanel />;
    case "help":
      return <HelpPanel />;
    default:
      return <OverviewPanel onCounts={onCounts} />;
  }
}
