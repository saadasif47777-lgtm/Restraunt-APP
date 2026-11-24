import { startServices, restartServices, closeServices } from "./services";
import jsQR from "jsqr";
import { PNG } from "pngjs";
import { test, expect } from "@playwright/test";
test.beforeAll(startServices);
test.afterAll(closeServices);
test("manager publishes a private draft and updates the same table QR", async ({
  page,
  request,
}) => {
  await page.goto("/");
  await expect(page.getByText("No dishes found.")).toBeVisible();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("button", { name: "Create branch" }).click();
  await page.getByLabel("Name", { exact: true }).fill("Cantt");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Create branch" })
    .click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.getByRole("button", { name: "Kitchen stations" }).click();
  await page.getByRole("button", { name: "Add station" }).click();
  await page.getByLabel("Name", { exact: true }).fill("Curry");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Add station" })
    .click();
  await expect(page.getByText("Curry", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Tables & QR" }).click();
  await page.getByRole("button", { name: "Add table" }).click();
  await page.getByLabel("Name", { exact: true }).fill("Table 5");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Add table" })
    .click();
  await expect(page.getByAltText("Menu QR for Table 5")).toBeVisible();
  const image = await page
    .getByAltText("Menu QR for Table 5")
    .getAttribute("src");
  const png = PNG.sync.read(Buffer.from(image!.split(",")[1], "base64"));
  const decoded = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);
  expect(decoded).toBeTruthy();
  await page.getByRole("button", { name: "Menu imports" }).click();
  await page.locator("input[type=file]").setInputFiles({
    name: "invalid.png",
    mimeType: "image/png",
    buffer: Buffer.from("invalid image"),
  });
  await page.getByRole("button", { name: "Start import" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toBeVisible();
  await page
    .locator("input[type=file]")
    .setInputFiles("tests/fixtures/sample-menu.pdf");
  await page.getByRole("button", { name: "Start import" }).click();
  await page
    .getByRole("button", { name: "Review additions" })
    .click({ timeout: 15000 });
  await page.getByLabel("Price", { exact: true }).fill("200");
  await page.getByRole("button", { name: "Apply to draft" }).click();
  await expect(
    page.getByRole("button", { name: "Apply to draft" }),
  ).not.toBeVisible();
  await page.getByRole("button", { name: "Menu manager", exact: true }).click();
  await page.getByRole("button", { name: "Add dish" }).click();
  await page.getByLabel("Dish name").fill("Chicken Karahi");
  await page.getByLabel("Price", { exact: true }).fill("950");
  await page.getByText("Modifiers, photos and dietary details").click();
  await page.getByLabel("Dish photo").setInputFiles("tests/fixtures/karahi.jpg");
  await expect(page.getByAltText("Draft dish photo")).toBeVisible();

  await page.getByRole("button", { name: "Save dish" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.getByRole("button", { name: "Preview menu" }).click();
  await expect(
    page.getByRole("dialog").getByText("PKR 200", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close", exact: true }).click();
  const url = decoded!.data;
  const publicPage = await page.context().newPage();
  expect(new URL(url).origin).toBe("http://guest.tablelane.test:3012");
  await publicPage.setViewportSize({ width: 390, height: 844 });
  await publicPage.goto(url);
  await expect(
    publicPage.getByText("Menu has not been published"),
  ).toBeVisible();
  async function publish() {
    await page.getByRole("button", { name: "Publish menu" }).click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Publish menu" })
      .click();
    await expect(page.getByRole("dialog")).not.toBeVisible();
  }
  await publish();
  await publicPage.reload();
  await expect(publicPage.getByText("Main · Table 5")).toBeVisible();
  await expect(publicPage.getByText("PKR 950", { exact: true })).toBeVisible();
  await expect(publicPage.getByText("PKR 200", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Chicken Karahi" }).first().click();
  await page.getByLabel("Price", { exact: true }).fill("990");
  await page.getByRole("button", { name: "Save dish" }).click();
  await restartServices();
  await publicPage.reload();
  await expect(publicPage.getByText("PKR 950", { exact: true })).toBeVisible();
  const photo = publicPage.locator("summary img").first();
  await expect
    .poll(() => photo.evaluate((el) => (el as HTMLImageElement).naturalWidth))
    .toBeGreaterThan(0);
  const imports = await (
    await request.get("/api/branches/test-branch/imports")
  ).json();
  const original =
    "/api/branches/test-branch/imports/" + imports[0].id + "/source/0";
  expect((await request.get(original)).headers()["content-type"]).toContain(
    "application/pdf",
  );
  const guestHome = await page.context().newPage();
  expect((await guestHome.goto("http://127.0.0.1:3012/"))?.status()).toBe(200);
  await expect(
    guestHome.getByRole("heading", { name: "Open your table menu" }),
  ).toBeVisible();
  await expect(
    guestHome.getByRole("button", { name: "Publish menu" }),
  ).toHaveCount(0);
  for (const path of [original, "/api/branches", "/preview/table-ordering"])
    expect((await request.get("http://127.0.0.1:3012" + path)).status()).toBe(
      404,
    );
  expect(
    (
      await request.post(
        "http://127.0.0.1:3012/api/branches/test-branch/publish",
        { data: { revision: 1 } },
      )
    ).status(),
  ).toBe(404);
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Chicken Karahi" }).first(),
  ).toBeVisible();
  await publish();
  await publicPage.reload();
  await expect(publicPage.getByText("PKR 990", { exact: true })).toBeVisible();
  for (const width of [390, 768, 1366]) {
    await page.setViewportSize({ width, height: 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
  }
});
test("development modules load and sample ordering stays in preview", async ({
  page,
}) => {
  for (const module of [
    "waiter-floor",
    "kitchen-display",
    "billing",
    "guest-tracker",
    "reports",
    "guest-experience",
    "table-ordering",
  ]) {
    await page.goto("/preview/" + module);
    await expect(
      page.getByText("Development preview", { exact: true }),
    ).toBeVisible();
  }
  await page.getByText("Join sample visit").click();
  await page.getByText("Submit preview round").click();
  await expect(page.getByText("Round recorded in preview")).toBeVisible();
});
