import { calculatorMenuItems, menuSections } from "@/lib/data";
import { hasFeaturePermission, permissionForMenuHref, type AppSession } from "@/lib/feature-permissions";

export function getActiveSidebarHref(pathname: string) {
  const path = pathname === "/" ? "/dashboard" : pathname;
  return [...menuSections.flatMap((section) => section.items), ...calculatorMenuItems]
    .filter((item) => !("external" in item && item.external)
      && (path === item.href || path.startsWith(`${item.href}/`)))
    .sort((first, second) => second.href.length - first.href.length)[0]?.href;
}

export function getVisibleSidebarSections(session: AppSession | null) {
  return menuSections.map((section) => ({
    ...section,
    calculator: Boolean(section.calculator && hasFeaturePermission(session, "calculator")),
    items: section.items.filter((item) => {
      if (item.href === "/settings") return session?.role === "admin";
      const permission = permissionForMenuHref(item.href);
      return !permission || hasFeaturePermission(session, permission);
    }),
  })).filter((section) => section.items.length > 0 || section.calculator);
}
