import assert from "node:assert/strict";
import test from "node:test";
import { calculatorMenuItems, menuSections } from "../lib/data";
import { getActiveSidebarHref, getVisibleSidebarSections } from "../lib/sidebar-navigation";
import type { AppSession } from "../lib/feature-permissions";

const member: AppSession = {
  userId: "sidebar-test", username: "test", displayName: "Test", role: "member",
  permissions: ["calculator"], expiresAt: 0,
};

test("groups follow the personal, research, corporate action and tools workflow", () => {
  assert.deepEqual(menuSections.map((section) => section.id), ["overview", "personal", "research", "corporate-actions", "tools", "settings"]);
  assert.deepEqual(menuSections.find((section) => section.id === "personal")?.items.map((item) => item.href), ["/accumulation", "/portfolio", "/journal"]);
  const hrefs = [...menuSections.flatMap((section) => section.items), ...calculatorMenuItems].map((item) => item.href);
  assert.equal(new Set(hrefs).size, hrefs.length);
  assert.equal(hrefs.length, 21);
  const rightIssueIndex = calculatorMenuItems.findIndex((item) => item.href === "/calculator/right-issue");
  assert.equal(calculatorMenuItems[rightIssueIndex + 1].href, "/tools/right-issue-simulator");
});

test("each route selects just its most specific menu", () => {
  for (const item of [...menuSections.flatMap((section) => section.items), ...calculatorMenuItems]) {
    assert.equal(getActiveSidebarHref(item.href), item.href);
    assert.equal(getActiveSidebarHref(`${item.href}/detail`), item.href);
  }
  assert.equal(getActiveSidebarHref("/"), "/dashboard");
  assert.equal(getActiveSidebarHref("/stocks/TOSK"), "/stocks");
  assert.equal(getActiveSidebarHref("/corporate-action/dividend"), "/corporate-action");
  assert.equal(getActiveSidebarHref("/stocks-other"), undefined);
  assert.equal(getActiveSidebarHref("/calculator/unknown"), undefined);
});

test("calculator-only members keep the calculator group without unrelated features", () => {
  const sections = getVisibleSidebarSections(member);
  assert.deepEqual(sections.map((section) => section.id), ["tools", "settings"]);
  assert.equal(sections[0].calculator, true);
  assert.deepEqual(sections[0].items, []);
  assert.deepEqual(sections[1].items.map((item) => item.href), ["/bantuan"]);
});

test("restricted groups disappear while admin retains all features", () => {
  assert.ok(!getVisibleSidebarSections({ ...member, permissions: [] }).some((section) => section.calculator));
  const adminSections = getVisibleSidebarSections({ ...member, role: "admin" });
  assert.equal(adminSections.length, menuSections.length);
  assert.ok(adminSections.flatMap((section) => section.items).some((item) => item.href === "/settings"));
  const researchSections = getVisibleSidebarSections({ ...member, permissions: ["stocks", "ownership"] });
  assert.deepEqual(researchSections.find((section) => section.id === "research")?.items.map((item) => item.href), ["/stocks", "/ownership"]);
});
