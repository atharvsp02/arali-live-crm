import { expect, test, type Page } from "@playwright/test";

async function signIn(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

async function clearUnread(page: Page) {
  await page.evaluate(async () => {
    const response = await fetch("/api/notifications/read-all", {
      method: "PATCH",
    });

    if (!response.ok) {
      throw new Error(`Unable to clear notifications: ${response.status}`);
    }
  });
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Open notifications, 0 unread" }),
  ).toBeVisible();
}

test("presents the public CRM landing page and demo entry point", async ({
  page,
}) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", {
      name: "Customer ownership that reaches the right person, right now.",
    }),
  ).toBeVisible();
  const technologyStack = page.getByLabel("Technology stack");
  await expect(
    technologyStack.getByText("PostgreSQL", { exact: true }),
  ).toBeVisible();
  await expect(
    technologyStack.getByText("Socket.IO", { exact: true }),
  ).toBeVisible();

  await page
    .locator(".landing-hero-actions")
    .getByRole("link", { name: "Open application" })
    .click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(
    page.getByRole("heading", { name: "Sign in to your workspace" }),
  ).toBeVisible();
  await expect(
    page.getByText("Optional demo access", { exact: true }).last(),
  ).toBeVisible();
});

test("delivers persisted assignment and worker notifications only to the assigned user", async ({
  browser,
}) => {
  test.setTimeout(60000);

  const adminContext = await browser.newContext();
  const assignedContext = await browser.newContext();
  const otherContext = await browser.newContext();
  const adminPage = await adminContext.newPage();
  const assignedPage = await assignedContext.newPage();
  const otherPage = await otherContext.newPage();
  const companyName = `E2E Account ${Date.now()}`;

  await Promise.all([
    signIn(adminPage, "admin@crm.local", "Admin123!"),
    signIn(assignedPage, "atharv@crm.local", "User123!"),
    signIn(otherPage, "maya@crm.local", "User123!"),
  ]);

  await expect(adminPage).toHaveURL(/\/admin$/);
  await expect(assignedPage.getByText("Welcome back, Atharv.")).toBeVisible();
  await expect(otherPage.getByText("Welcome back, Maya.")).toBeVisible();

  await Promise.all([clearUnread(assignedPage), clearUnread(otherPage)]);

  await adminPage
    .locator(".sidebar")
    .getByRole("button", { name: "Companies" })
    .click();
  await adminPage.getByRole("button", { name: "New company" }).click();
  await adminPage.getByLabel("Company name").fill(companyName);
  await adminPage.getByLabel("Industry").fill("Acceptance testing");
  await adminPage
    .getByLabel("Description")
    .fill("Created by the browser acceptance flow.");
  await adminPage.getByRole("button", { name: "Create company" }).click();
  await expect(adminPage.getByText("Company created")).toBeVisible();
  await expect(
    adminPage.getByRole("heading", { name: companyName }),
  ).toBeVisible();

  await adminPage
    .locator(".sidebar")
    .getByRole("button", { name: "Assignments" })
    .click();
  await adminPage.getByLabel("Target type").selectOption("COMPANY");
  await adminPage
    .locator('select[name="targetId"]')
    .selectOption({ label: companyName });
  await adminPage
    .getByLabel("Assign to")
    .selectOption({ label: "Atharv (atharv@crm.local)" });
  await adminPage.getByLabel("Assignment role").selectOption("ACCOUNT_OWNER");
  await adminPage.getByRole("button", { name: "Create and notify" }).click();

  await expect(adminPage.getByText("Assignment created")).toBeVisible();
  await expect(
    assignedPage
      .locator(".toast")
      .filter({ hasText: "New assignment" })
      .filter({ hasText: companyName }),
  ).toBeVisible({ timeout: 5000 });
  await expect(
    assignedPage.getByRole("button", {
      name: "Open notifications, 1 unread",
    }),
  ).toBeVisible();
  await expect(
    otherPage.getByRole("button", {
      name: "Open notifications, 0 unread",
    }),
  ).toBeVisible();
  await expect(
    otherPage.locator(".toast").filter({ hasText: "New assignment" }),
  ).toHaveCount(0);
  await expect(otherPage.getByText(companyName)).toHaveCount(0);

  await assignedPage.reload();
  await expect(
    assignedPage.getByRole("heading", { name: companyName }),
  ).toBeVisible();
  await assignedPage
    .getByRole("button", { name: /Open notifications/ })
    .click();
  const assignmentNotification = assignedPage
    .locator(".notification-item")
    .filter({ hasText: companyName })
    .filter({ hasText: "New company assignment" });
  await expect(assignmentNotification).toBeVisible();
  await assignmentNotification
    .getByRole("button", { name: "Mark read" })
    .click();
  await expect(assignmentNotification.getByLabel("Unread")).toHaveCount(0);
  await assignedPage
    .getByRole("button", { name: "Close notifications" })
    .last()
    .click();

  await expect(
    assignedPage
      .locator(".toast")
      .filter({ hasText: "Assignment reminder" })
      .filter({ hasText: companyName }),
  ).toBeVisible({ timeout: 45000 });
  await expect(
    assignedPage.getByRole("button", {
      name: "Open notifications, 1 unread",
    }),
  ).toBeVisible();

  await assignedPage.reload();
  await assignedPage
    .getByRole("button", { name: /Open notifications/ })
    .click();
  const reminderNotification = assignedPage
    .locator(".notification-item")
    .filter({ hasText: companyName })
    .filter({ hasText: "Assignment reminder" });
  await expect(reminderNotification).toBeVisible();
  await expect(
    otherPage.getByRole("button", {
      name: "Open notifications, 0 unread",
    }),
  ).toBeVisible();
  await expect(
    otherPage.locator(".toast").filter({ hasText: "Assignment reminder" }),
  ).toHaveCount(0);

  await adminPage.screenshot({
    path: "test-results/admin-assignment.png",
    fullPage: true,
  });
  await assignedPage.screenshot({
    path: "test-results/assigned-user-notifications.png",
    fullPage: true,
  });
  await otherPage.screenshot({
    path: "test-results/other-user.png",
    fullPage: true,
  });

  await Promise.all([
    adminContext.close(),
    assignedContext.close(),
    otherContext.close(),
  ]);
});
