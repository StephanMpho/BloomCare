import { test, expect, type Page } from "@playwright/test";

const stamp = Date.now();
const owner = { name: "Naledi", email: `owner${stamp}@example.com`, password: "correct-horse-1" };
// The monthly plan is made for next month, so shopping lists live there.
const nextMonth = (() => { const d = new Date(); return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1)).toISOString().slice(0, 7); })();
const partner = { name: "Mpho", email: `partner${stamp}@example.com`, password: "correct-horse-2" };

async function register(page: Page, u: typeof owner, next = "") {
  await page.goto(`/register${next ? `?next=${next}` : ""}`);
  await page.getByLabel("Your name").fill(u.name);
  await page.getByLabel("Email").fill(u.email);
  await page.getByLabel("Password").fill(u.password);
  await page.getByText("I understand BloomCare").click();
  await page.getByRole("button", { name: "Create account" }).click();
}

test.describe.serial("BloomCare critical workflows", () => {
  let page: Page;
  test.beforeAll(async ({ browser }) => { page = await browser.newPage(); });

  test("onboarding shows urgent medical notice before tracking", async () => {
    await register(page, owner);
    await page.waitForURL("**/onboarding");
    await page.getByLabel("First day of your last menstrual period").fill("2026-10-09");
    await page.getByLabel("Times vomited in the last 24 hours").fill("4");
    await page.getByText("No, they come back up").click();
    await page.getByText("Some pain").click();
    await page.getByText("I've lost weight").click();
    await page.getByText("Dizziness").click();
    await page.getByText("Unusual weakness").click();
    await page.getByRole("button", { name: "Continue" }).click();
    await page.waitForURL("**/onboarding?step=safety");
    await expect(page.getByRole("heading", { name: "Please get urgent medical assessment" })).toBeVisible();
    await expect(page.getByText("does not mean you've been assessed")).toBeVisible();
    await page.getByRole("button", { name: /I've read this/ }).click();
    await page.waitForURL("**/onboarding?step=2");
    await expect(page.getByText(/weeks?, \d+ days?/)).toBeVisible();
    await page.getByLabel("Foods you can manage right now").fill("polony, toast");
    await page.getByRole("button", { name: "Finish setup" }).click();
    await page.waitForURL((u) => u.pathname === "/");
    await expect(page.getByText(/Week \d+, day \d/).first()).toBeVisible();
    // Urgent banner remains visible after onboarding because symptoms were reported in the last 24h.
    await expect(page.getByText("Medical safety notice").first()).toBeVisible();
  });

  test("Workflow A: log breakfast; simple Today screen and 5-tab navigation", async () => {
    await page.goto("/food/new");
    await page.getByLabel("Search foods").fill("oats");
    await page.getByRole("button", { name: /Oats, cooked with water/ }).click();
    await page.getByLabel("Meal").selectOption("BREAKFAST");
    await page.getByLabel("Portion").fill("half a bowl");
    await page.getByText("😊 Well").click();
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await page.waitForURL("**/food?date=*");
    await expect(page.getByText("Oats, cooked with water").first()).toBeVisible();
    await page.goto("/");
    await expect(page.getByText("How are you feeling today?")).toBeVisible();
    await expect(page.getByRole("link", { name: "Photo of food" })).toBeVisible();
    const tabs = page.getByRole("navigation", { name: "Quick navigation" }).getByRole("link");
    await expect(tabs).toHaveText(["Today", "Food", "Plan", "Appts", "More"]);
  });

  test("Workflow B: record vomiting triggers safety guidance", async () => {
    await page.goto("/symptoms?vomit=1#log");
    await page.locator("#log").getByText("No", { exact: true }).first().click();
    await page.getByRole("button", { name: "Save" }).click();
    await page.waitForURL("**/symptoms?alert=1");
    await expect(page.getByText("Please get urgent medical assessment").first()).toBeVisible();
    await expect(page.getByText("Unable to keep fluids down").first()).toBeVisible();
  });

  test("Workflow C: monthly meal plan → weekly shopping lists", async () => {
    await page.goto("/planner");
    await page.getByRole("button", { name: /^Create .+ plan$/ }).last().click();
    await page.waitForURL("**/planner?*made=*");
    await expect(page.getByText(/plan ready: \d+ meals and snacks, with [45] weekly shopping lists/)).toBeVisible();
    await expect(page.getByRole("button", { name: /Swap/ }).first()).toBeVisible();
    await page.getByRole("button", { name: "Not tolerated" }).first().click();
    await expect(page.getByText("Not tolerated").first()).toBeVisible();
    await page.getByRole("button", { name: /Swap/ }).nth(1).click();
    await page.goto(`/groceries?month=${nextMonth}`);
    await expect(page.getByRole("heading", { name: "Buy every week" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Buy once a month" })).toBeVisible();
    // Each product appears once in the month overview (no repeats per weekly shop).
    await expect(page.getByText("Bananas 1 kg", { exact: true })).toHaveCount(1);
    await page.getByRole("tab", { name: "Weekly shops" }).click();
    await expect(page.getByRole("heading", { name: /^Shop 1 · / })).toBeVisible();
    await expect(page.getByRole("heading", { name: /^Shop 4 · / })).toBeVisible();
    await page.goto("/planner/foods");
    await expect(page.getByRole("heading", { name: "Avoid in pregnancy" })).toBeVisible();
  });

  test("Workflow D: shopping updates remaining budget", async () => {
    await page.goto(`/groceries?month=${nextMonth}&view=week`);
    const before = await page.getByText("Remaining", { exact: true }).locator("..").textContent();
    await page.getByText("Enter actual price / store").first().click();
    await page.getByLabel("Actual price (R)").first().fill("123.45");
    await page.getByLabel("Purchased").first().check();
    await page.getByRole("button", { name: "Save" }).first().click();
    await expect(page.getByText("Paid R123.45")).toBeVisible();
    const after = await page.getByText("Remaining", { exact: true }).locator("..").textContent();
    expect(after).not.toEqual(before);
    expect(after).toContain("R2 877");
  });

  test("Workflow F: appointment + clinician summary", async () => {
    await page.goto("/appointments");
    await page.getByLabel("Doctor or clinic").fill("Test Clinic");
    await page.getByLabel("Date").fill("2027-01-10");
    await page.getByLabel("Time").fill("09:30");
    await page.getByLabel("Questions to ask").fill("Can I have anti-sickness medicine?");
    await page.getByRole("button", { name: "Add appointment" }).click();
    await expect(page.getByText("Appointment saved.")).toBeVisible();
    await page.goto("/reports/print?range=7");
    await expect(page.getByRole("heading", { name: "Warning signs recorded" })).toBeVisible();
    await expect(page.getByText("unable to keep fluids down").first()).toBeVisible();
    await expect(page.getByText("Can I have anti-sickness medicine?")).toBeVisible();
  });

  test("Workflow E: consent-based partner access and revocation", async ({ browser }) => {
    await page.goto("/settings#partner");
    await page.getByText("I choose to share the selected information").click();
    await page.getByRole("button", { name: "Create private invite link" }).click();
    await page.waitForURL("**/settings?invite=*");
    const link = await page.locator("input[readonly]").inputValue();
    expect(link).toContain("/invite/");
    const invitePath = new URL(link).pathname;

    const p2 = await (await browser.newContext()).newPage();
    await register(p2, partner, invitePath);
    await p2.waitForURL(`**${invitePath}`);
    await p2.getByRole("button", { name: /Accept as/ }).click();
    await p2.waitForURL("**/partner");
    await expect(p2.getByRole("heading", { name: /Supporting Naledi/ })).toBeVisible();
    await expect(p2.getByText("Foods that work for her right now")).toBeVisible();
    // Symptoms were not shared by default
    await p2.goto("/symptoms");
    await p2.waitForURL("**/partner?denied=1");
    await expect(p2.getByText("isn't shared with you")).toBeVisible();

    // Owner revokes — partner loses access immediately
    page.once("dialog", (d) => d.accept());
    await page.goto("/settings");
    const btn = page.getByRole("button", { name: "Revoke access now" });
    await btn.scrollIntoViewIfNeeded();
    // Mobile emulation mis-reports hit-testing for this button after auto-scroll; elementFromPoint confirms it is on top.
    await btn.click({ force: true });
    await expect(page.getByRole("button", { name: "Create private invite link" })).toBeVisible();
    await p2.goto("/partner");
    await p2.waitForURL("**/invite/invalid?reason=revoked");
    await expect(p2.getByText("partner access has been turned off")).toBeVisible();
  });
});
