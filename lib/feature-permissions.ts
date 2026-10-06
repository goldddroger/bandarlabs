export const featurePermissions = [
  { id: "dashboard", label: "Dashboard", description: "Ringkasan pasar, heatmap sektor, dan market mover.", homePath: "/dashboard" },
  { id: "accumulation", label: "Accumulation Radar", description: "Watchlist pribadi, swing, harian, dan rekomendasi eksternal.", homePath: "/accumulation" },
  { id: "journal", label: "Jurnal Riset", description: "Membaca dan mengelola catatan riset beserta lampiran.", homePath: "/journal" },
  { id: "portfolio", label: "Portfolio", description: "Posisi aktif, riwayat trade, dan equity history.", homePath: "/portfolio" },
  { id: "corporate_action", label: "Corporate Action", description: "Agenda emiten, catatan, reminder, dan analisis aksi korporasi.", homePath: "/corporate-action" },
  { id: "stocks", label: "Detail Saham", description: "Daftar saham, profil ticker, charting, dan riset per emiten.", homePath: "/stocks" },
  { id: "financial_research", label: "Bedah Laporan", description: "Unggah dan analisis laporan keuangan emiten.", homePath: "/financial-research" },
  { id: "broker_summary", label: "Broker Summary", description: "Aktivitas broker dari Stockbit dan Axentraz.", homePath: "/broker-summary" },
  { id: "ownership", label: "Ownership Tracker", description: "Import dan perbandingan data pemegang saham.", homePath: "/ownership" },
  { id: "fca", label: "FCA Tracker", description: "Daftar papan pemantauan khusus dan reminder perubahan.", homePath: "/fca" },
  { id: "stock_screener", label: "Stock Screener", description: "Akses sumber dan alat screening saham.", homePath: "/stock-screener" },
  { id: "group_konglo", label: "Group Konglo", description: "Pemetaan grup usaha dan ticker terkait.", homePath: "/group-konglo" },
  { id: "calculator", label: "Kalkulator Saham", description: "Position sizing, capital gain, dividen, right issue, dan private placement.", homePath: "/calculator/capital-gain" },
  { id: "notifications", label: "Notifikasi", description: "Reminder dan alert lintas fitur.", homePath: "/notifikasi" },
] as const;

export type FeaturePermission = (typeof featurePermissions)[number]["id"];

export type AppSession = {
  userId: string | null;
  username: string;
  displayName: string;
  role: "admin" | "member";
  permissions: FeaturePermission[];
  expiresAt: number;
};

const permissionIds = new Set<string>(featurePermissions.map((permission) => permission.id));

export function normalizePermissions(values: unknown): FeaturePermission[] {
  if (!Array.isArray(values)) return [];
  return Array.from(new Set(values.filter((value): value is FeaturePermission => typeof value === "string" && permissionIds.has(value))));
}

export function hasFeaturePermission(session: Pick<AppSession, "role" | "permissions"> | null | undefined, permission: FeaturePermission) {
  return session?.role === "admin" || Boolean(session?.permissions.includes(permission));
}

export function homePathForSession(session: Pick<AppSession, "role" | "permissions">) {
  if (session.role === "admin") return "/dashboard";
  return featurePermissions.find((permission) => session.permissions.includes(permission.id))?.homePath ?? "/forbidden";
}

export function permissionForPath(pathname: string): FeaturePermission | null {
  const pageRules: Array<[string, FeaturePermission]> = [
    ["/tools/right-issue-simulator", "calculator"],
    ["/financial-research", "financial_research"], ["/broker-summary", "broker_summary"],
    ["/stock-screener", "stock_screener"], ["/group-konglo", "group_konglo"],
    ["/calculator-gain", "calculator"], ["/calculator", "calculator"], ["/corporate-action", "corporate_action"],
    ["/accumulation", "accumulation"], ["/portfolio", "portfolio"], ["/ownership", "ownership"],
    ["/journal", "journal"], ["/stocks", "stocks"], ["/dashboard", "dashboard"],
    ["/notifikasi", "notifications"], ["/alerts", "notifications"], ["/fca", "fca"],
  ];
  const apiRules: Array<[string, FeaturePermission]> = [
    ["/api/financial-reports", "financial_research"], ["/api/audit-watch", "financial_research"],
    ["/api/axentraz", "broker_summary"], ["/api/ownership", "ownership"], ["/api/fca", "fca"],
    ["/api/portfolio", "portfolio"], ["/api/accumulation", "accumulation"], ["/api/journal", "journal"],
    ["/api/corporate-actions", "corporate_action"], ["/api/right-issue", "calculator"],
    ["/api/private-placement", "calculator"], ["/api/market-movers", "dashboard"],
    ["/api/stock-ca-research", "stocks"], ["/api/notifications", "notifications"],
  ];
  return [...apiRules, ...pageRules].find(([prefix]) => (
    pathname === prefix
    || pathname.startsWith(`${prefix}/`)
    || (prefix.startsWith("/api/") && pathname.startsWith(`${prefix}-`))
  ))?.[1] ?? null;
}

export function permissionForMenuHref(href: string) {
  return permissionForPath(href);
}
