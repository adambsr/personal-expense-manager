import { chromium } from "@playwright/test";

const email = "codex.qa.profile.sync@personal-expense.test";
const password = "Temporary-QA-Only-528!";
const firstName = `Amina QA ${Date.now()}`;
const transactionDescription = `QA sync ${Date.now()}`;
const editedDescription = `${transactionDescription} edited`;
const errors = [];
const browser = await chromium.launch({ channel: "msedge", headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
let dashboardRequests = 0;
page.on("request", (request) => { if (request.url().includes("/api/dashboard/summary")) dashboardRequests += 1; });
page.on("pageerror", (error) => errors.push(error.message));
page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
const check = (condition, message) => { if (!condition) throw new Error(message); };

try {
  await page.goto("http://127.0.0.1:5173/login");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: /Sign in/ }).click();
  await page.getByRole("heading", { name: "Financial Overview" }).waitFor();
  await page.getByRole("heading", { name: "Financial Overview" }).waitFor();
  await page.locator(".app-header").getByRole("button", { name: /Open profile menu/ }).click();
  await page.getByRole("menuitem", { name: "My Profile" }).click();
  await page.getByRole("heading", { name: "My Profile" }).waitFor();
  await page.getByRole("heading", { name: "My Profile" }).waitFor();
  await page.getByLabel("First name").fill(firstName);
  await page.getByLabel("Last name").fill("QA Member");
  await page.getByRole("button", { name: "Save changes" }).click();
  await page.getByText("Profile changes saved.").waitFor();
  check(await page.getByLabel("First name").inputValue() === firstName, "Profile first name was not retained after save");
  await page.reload();
  await page.getByRole("heading", { name: "My Profile" }).waitFor();
  check(await page.getByLabel("First name").inputValue() === firstName, "Profile was not restored from the authenticated backend session");
  check(await page.getByLabel("Last name").inputValue() === "QA Member", "Profile last name was not restored");

  const validPng = { name: "avatar.png", mimeType: "image/png", buffer: Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]) };
  await page.locator("#profile-picture").setInputFiles(validPng);
  check(await page.getByRole("button", { name: "Save changes" }).isEnabled(), "Avatar selection did not enable saving");
  check(await page.getByText("Picture will be saved with your changes.").isVisible(), "Avatar was not staged for explicit save");
  check(await page.getByText("Profile changes saved.").count() === 0, "Avatar selection displayed a success notification before save");
  await page.route("**/api/auth/me/avatar", async (route) => {
    if (route.request().method() === "PUT") await route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: { message: "Temporary avatar failure" } }) });
    else await route.continue();
  });
  await page.getByRole("button", { name: "Save changes" }).click();
  await page.getByRole("alert").filter({ hasText: "Temporary avatar failure" }).waitFor();
  check(await page.getByText("Profile changes saved.").count() === 0, "Failed avatar save displayed a success notification");
  await page.unroute("**/api/auth/me/avatar");
  await page.getByRole("button", { name: "Save changes" }).click();
  await page.getByText("Profile changes saved.").waitFor();
  check(await page.getByRole("button", { name: "Remove profile picture" }).isVisible(), "Saved avatar removal action is missing");
  await page.getByText("Profile changes saved.").waitFor({ state: "hidden", timeout: 10000 });
  await page.getByRole("button", { name: "Remove profile picture" }).click();
  check(await page.getByText("Picture will be removed when you save.").isVisible(), "Avatar removal was not staged");
  check(await page.getByText("Profile changes saved.").count() === 0, "Avatar removal displayed a success notification before save");
  await page.getByRole("button", { name: "Save changes" }).click();
  await page.getByText("Profile changes saved.").waitFor();
  check(await page.getByRole("button", { name: "Remove profile picture" }).count() === 0, "Persisted avatar removal did not update profile state");

  await page.getByRole("link", { name: "Transactions" }).click();
  await page.getByRole("heading", { name: "Transactions" }).waitFor();
  const beforeCreate = dashboardRequests;
  await page.getByRole("button", { name: "New transaction" }).click();
  await page.locator("#transaction-amount").fill("12.50");
  await page.getByLabel("Category: Choose a category").click();
  const categoryItem = page.getByRole("menuitem", { name: "Food & Groceries" });
  if (await categoryItem.count()) await categoryItem.click();
  else await page.getByRole("menuitem").first().click();
  await page.getByLabel("Notes / Description Optional").fill(transactionDescription);
  const createRefresh = page.waitForResponse((response) => response.url().includes("/api/dashboard/summary"), { timeout: 10000 });
  await page.getByRole("button", { name: "Save Transaction" }).click();
  await createRefresh;
  await page.locator(".transactions-main .transaction-management-table").getByText(transactionDescription).first().waitFor();
  await page.waitForTimeout(500);
  const afterCreate = dashboardRequests;
  check(afterCreate > beforeCreate, "Dashboard did not refresh after transaction creation");

  const beforeEdit = dashboardRequests;
  const row = page.locator(".transactions-main tr").filter({ hasText: transactionDescription }).first();
  await row.getByRole("button", { name: `Edit ${transactionDescription}` }).click();
  await page.getByLabel("Notes / Description Optional").fill(editedDescription);
  await page.getByRole("button", { name: "Save changes" }).click();
  await page.locator(".transactions-main .transaction-management-table").getByText(editedDescription).first().waitFor();
  await page.waitForTimeout(500);
  check(dashboardRequests > beforeEdit, "Dashboard did not refresh after transaction edit");

  const beforeDelete = dashboardRequests;
  page.once("dialog", (dialog) => dialog.accept());
  const editedRow = page.locator(".transactions-main tr").filter({ hasText: editedDescription }).first();
  const deleteRefresh = page.waitForResponse((response) => response.url().includes("/api/dashboard/summary"), { timeout: 10000 });
  await editedRow.getByRole("button", { name: `Delete ${editedDescription}` }).click();
  await editedRow.waitFor({ state: "detached" });
  await page.waitForTimeout(500);
  check(dashboardRequests > beforeDelete, "Dashboard did not refresh after transaction deletion");

  await page.goto("http://127.0.0.1:5173/transactions");
  await page.getByRole("heading", { name: "Transactions" }).waitFor();
  await page.goBack();
  await page.getByRole("heading", { name: "Financial Overview" }).waitFor();
  await page.goForward();
  await page.getByRole("heading", { name: "Transactions" }).waitFor();
  const desktopMetrics = await page.locator(".transaction-management-table").first().evaluate((element) => ({ fontSize: getComputedStyle(element.querySelector("td")).fontSize, headerBg: getComputedStyle(element.querySelector("thead tr")).backgroundColor }));
  await page.screenshot({ path: "C:/Users/Adam/AppData/Local/Temp/pem-transactions-desktop.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Open navigation menu" }).click();
  await page.getByRole("dialog").getByRole("link", { name: "Dashboard" }).waitFor();
  await page.keyboard.press("Escape");
  check(await page.getByRole("dialog").count() === 0, "Mobile drawer did not close on Escape");
  await page.getByRole("button", { name: "Open navigation menu" }).click();
  await page.getByRole("dialog").getByRole("link", { name: "Dashboard" }).click();
  await page.getByRole("heading", { name: "Financial Overview" }).waitFor();
  check(await page.getByRole("dialog").count() === 0, "Mobile drawer did not close after navigation");
  await page.screenshot({ path: "C:/Users/Adam/AppData/Local/Temp/pem-dashboard-mobile.png", fullPage: true });
  console.log(JSON.stringify({ ok: true, profileRestore: true, avatarStageSaveFailureRemoval: true, dashboardRefreshAfter: { create: afterCreate > beforeCreate, edit: true, delete: true }, historyBackForward: true, mobileDrawerKeyboardAndNavigation: true, desktopTableStyle: desktopMetrics, browserErrors: errors }));
} finally {
  await browser.close();
}

















