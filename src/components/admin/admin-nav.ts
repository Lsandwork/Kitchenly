export type AdminPageId =
  | "overview"
  | "users"
  | "activity"
  | "reports"
  | "calendar"
  | "articles"
  | "drafts"
  | "scheduled"
  | "published"
  | "generate"
  | "social-generator"
  | "media"
  | "campaigns"
  | "newsletter"
  | "analytics"
  | "posting-analytics"
  | "web-analytics"
  | "settings"
  | "help";

export type AdminNavBadgeKey = "drafts" | "scheduled" | "published" | "users" | "campaigns";

export type AdminDashboardNavItem = {
  id: AdminPageId;
  label: string;
  badgeKey?: AdminNavBadgeKey;
  mobileHidden?: boolean;
};

export type AdminDashboardNavSection = {
  id: string;
  label: string;
  items: AdminDashboardNavItem[];
};

export const ADMIN_APP_PATH = "/admin";

/** Kitchen Friend Admin information architecture. */
export const ADMIN_DASHBOARD_NAV: AdminDashboardNavSection[] = [
  {
    id: "main",
    label: "MAIN",
    items: [
      { id: "overview", label: "Overview" },
      { id: "users", label: "Users", badgeKey: "users" },
      { id: "activity", label: "Activity" },
      { id: "reports", label: "Reports" },
    ],
  },
  {
    id: "content",
    label: "CONTENT",
    items: [
      { id: "calendar", label: "Content Calendar" },
      { id: "articles", label: "All Articles" },
      { id: "drafts", label: "Drafts", badgeKey: "drafts", mobileHidden: true },
      { id: "scheduled", label: "Scheduled", badgeKey: "scheduled", mobileHidden: true },
      { id: "published", label: "Published", badgeKey: "published", mobileHidden: true },
      { id: "generate", label: "Blog Generator" },
      { id: "social-generator", label: "Social Generator" },
      { id: "media", label: "Media Library", mobileHidden: true },
    ],
  },
  {
    id: "growth",
    label: "GROWTH",
    items: [
      { id: "campaigns", label: "Email Campaigns", badgeKey: "campaigns" },
      { id: "newsletter", label: "Newsletter" },
    ],
  },
  {
    id: "analytics",
    label: "ANALYTICS",
    items: [
      { id: "analytics", label: "Product Analytics" },
      { id: "posting-analytics", label: "Posting Analytics", mobileHidden: true },
      { id: "web-analytics", label: "Web Analytics", mobileHidden: true },
    ],
  },
  {
    id: "settings",
    label: "SETTINGS",
    items: [
      { id: "settings", label: "Admin Settings" },
      { id: "help", label: "How to Use" },
    ],
  },
];

export function isAdminPageId(value: string | null | undefined): value is AdminPageId {
  if (!value) return false;
  return ADMIN_DASHBOARD_NAV.some((section) => section.items.some((item) => item.id === value));
}

export function adminPageTitle(page: AdminPageId): string {
  for (const section of ADMIN_DASHBOARD_NAV) {
    const item = section.items.find((entry) => entry.id === page);
    if (item) return item.label;
  }
  return "Admin";
}

export const ADMIN_MOBILE_TABS: AdminPageId[] = [
  "overview",
  "users",
  "generate",
  "calendar",
  "analytics",
];
