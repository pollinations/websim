import assert from "node:assert/strict";
import fs from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Pollinations } from "@pollinations/sdk";
import { chromium } from "playwright";

const origin = "http://localhost:16386";
const tokenKey = "polli:pk_wYCqFfSdCXZL8UBW:token";
const token = process.env.POLLINATIONS_API_KEY;
assert.ok(
    token,
    "Set POLLINATIONS_API_KEY to run authenticated browser checks",
);
(async () => {
    const browser = await chromium.launch({
        headless: true,
        executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
    });
    const scratch = fs.mkdtempSync(join(tmpdir(), "websim-browser-"));
    fs.mkdirSync(new URL("../screenshots/", import.meta.url), {
        recursive: true,
    });
    const output = [];
    const record = (row) => {
        output.push(row);
        console.log(JSON.stringify(row));
    };
    try {
        for (const viewport of [
            { width: 1440, height: 900 },
            { width: 390, height: 844 },
        ]) {
            const context = await browser.newContext({ viewport });
            const page = await context.newPage();
            const errors = [],
                failedAssets = [];
            let generationRequests = 0;
            page.on("pageerror", (e) => errors.push(e.message));
            page.on("response", (r) => {
                if (
                    r.url().startsWith(`${origin}/assets/`) &&
                    r.status() >= 400
                )
                    failedAssets.push(r.status());
            });
            page.on("request", (r) => {
                if (new URL(r.url()).pathname === "/v1/chat/completions")
                    generationRequests++;
            });
            const response = await page.goto(
                `${origin}/a%20garden%2Froom/?model=claude-fast`,
            );
            assert.equal(response.status(), 200);
            await page.getByRole("textbox").waitFor();
            assert.equal(new URL(page.url()).pathname, "/");
            assert.equal(
                await page.getByRole("textbox").inputValue(),
                "a garden/room",
            );
            assert.equal(
                await page
                    .getByRole("button", {
                        name: "Structured: Cleaner hierarchy",
                        exact: true,
                    })
                    .getAttribute("aria-pressed"),
                "true",
            );
            assert.equal(generationRequests, 0);
            assert.ok(
                await page.evaluate(
                    () => document.documentElement.scrollWidth <= innerWidth,
                ),
            );
            assert.deepEqual(errors, []);
            assert.deepEqual(failedAssets, []);
            if (viewport.width === 1440) {
                await page.setViewportSize({ width: 1280, height: 720 });
                await page.evaluate(() => document.fonts.ready);
                await page.screenshot({
                    path: new URL("../screenshots/websim.png", import.meta.url)
                        .pathname,
                });
            }
            let authVerified = false;
            await page.route(
                "https://enter.pollinations.ai/authorize**",
                async (route) => {
                    const u = new URL(route.request().url());
                    assert.equal(
                        u.searchParams.get("client_id"),
                        "pk_wYCqFfSdCXZL8UBW",
                    );
                    assert.equal(
                        u.searchParams.get("redirect_uri"),
                        `${origin}/`,
                    );
                    assert.equal(u.searchParams.get("response_type"), "code");
                    assert.equal(
                        u.searchParams.get("code_challenge_method"),
                        "S256",
                    );
                    assert.equal(u.searchParams.get("scope"), "profile usage");
                    assert.ok(u.searchParams.get("code_challenge"));
                    assert.ok(u.searchParams.get("state"));
                    authVerified = true;
                    await route.fulfill({
                        status: 200,
                        body: "Login request verified; no credential issued.",
                    });
                },
            );
            await page
                .getByRole("button", { name: "Generate", exact: true })
                .click();
            await page.waitForURL("https://enter.pollinations.ai/authorize**");
            assert.ok(authVerified);
            record({
                check: "legacy link, root PKCE login, no automatic spending, assets and layout",
                width: viewport.width,
                passed: true,
            });
            await context.close();
        }
        const denied = await browser.newContext();
        await denied.addInitScript(() => {
            if (location.origin === "http://localhost:16386") {
                sessionStorage.setItem(
                    "polli:pk_wYCqFfSdCXZL8UBW:oauth_state",
                    "websim-test-state",
                );
                sessionStorage.setItem(
                    "polli:pk_wYCqFfSdCXZL8UBW:oauth_return_path",
                    "http://localhost:16386/?prompt=restored%20garden&model=gemini-fast",
                );
            }
        });
        const deniedPage = await denied.newPage();
        await deniedPage.goto(
            `${origin}/?error=access_denied&state=websim-test-state`,
        );
        await deniedPage.getByRole("textbox").waitFor();
        assert.equal(
            await deniedPage.getByRole("textbox").inputValue(),
            "restored garden",
        );
        assert.equal(
            await deniedPage
                .getByRole("button", {
                    name: "Creative: Richer page ideas",
                    exact: true,
                })
                .getAttribute("aria-pressed"),
            "true",
        );
        await denied.close();
        record({
            check: "prompt/model restored after SDK processes an OAuth callback",
            passed: true,
        });
        await new Pollinations({ apiKey: token }).accountProfile();
        const context = await browser.newContext({
            viewport: { width: 1440, height: 900 },
            acceptDownloads: true,
        });
        await context.addInitScript(
            ({ token, key, origin }) => {
                if (location.origin === origin)
                    sessionStorage.setItem(key, token);
            },
            { token, key: tokenKey, origin },
        );
        const page = await context.newPage();
        const errors = [],
            legacyRequests = [];
        page.on("pageerror", (e) => errors.push(e.message));
        page.on("request", (r) => {
            if (new URL(r.url()).pathname === "/api/generate")
                legacyRequests.push(r.method());
        });
        await page.goto(`${origin}/`);
        await page
            .getByRole("button", { name: "App user menu", exact: true })
            .waitFor();
        const prompt =
            "Build a tiny interactive Impossible Garden with a heading and a single button labelled Count. Clicking the button must display Clicks: 1, then Clicks: 2. Use inline CSS and inline SVG plants. Keep the entire page under 120 lines, no external resources.";
        await page.getByRole("textbox").fill(prompt);
        const pending = page.waitForResponse(
            (r) =>
                new URL(r.url()).origin === "https://gen.pollinations.ai" &&
                new URL(r.url()).pathname === "/v1/chat/completions",
            { timeout: 180000 },
        );
        await page
            .getByRole("button", { name: "Generate", exact: true })
            .click();
        const response = await pending;
        assert.equal(response.status(), 200);
        const request = response.request().postDataJSON();
        assert.equal(request.model, "openai-fast");
        assert.equal(request.messages.at(-1).content, prompt);
        await page
            .getByRole("button", { name: "Save", exact: true })
            .waitFor({ timeout: 180000 });
        const iframe = page.frameLocator(
            'iframe[title="Generated Websim page"]',
        );
        await iframe
            .getByRole("button", { name: "Count", exact: true })
            .click();
        await iframe.getByText("Clicks: 1", { exact: false }).waitFor();
        const html = await page.locator("iframe").getAttribute("srcdoc");
        assert.ok(html.includes("<html"));
        assert.ok(!html.includes(token));
        const downloadPending = page.waitForEvent("download");
        await page.getByRole("button", { name: "Save", exact: true }).click();
        const download = await downloadPending;
        assert.equal(download.suggestedFilename(), "websim.html");
        await download.saveAs(join(scratch, "generated.html"));
        assert.equal(
            fs.readFileSync(join(scratch, "generated.html"), "utf8"),
            html,
        );
        const popupPending = page.waitForEvent("popup");
        await page.getByRole("button", { name: "Open", exact: true }).click();
        const popup = await popupPending;
        await popup.locator("iframe").waitFor();
        await popup
            .frameLocator("iframe")
            .getByRole("button", { name: "Count", exact: true })
            .click();
        await popup
            .frameLocator("iframe")
            .getByText("Clicks: 1", { exact: false })
            .waitFor();
        for (const host of [page, popup]) {
            const frame = host.frames().find((f) => f.parentFrame());
            assert.ok(frame);
            const access = await frame.evaluate(() => {
                let parentBlocked = false,
                    storageBlocked = false;
                try {
                    void parent.document.body;
                } catch {
                    parentBlocked = true;
                }
                try {
                    void localStorage.length;
                } catch {
                    storageBlocked = true;
                }
                return { parentBlocked, storageBlocked };
            });
            assert.deepEqual(access, {
                parentBlocked: true,
                storageBlocked: true,
            });
        }
        await popup.close();
        assert.deepEqual(legacyRequests, []);
        assert.deepEqual(errors, []);
        assert.equal(
            await page.evaluate((key) => localStorage.getItem(key), tokenKey),
            null,
        );
        await page.setViewportSize({ width: 1280, height: 720 });
        await page.evaluate(() => document.fonts.ready);

        await page.setViewportSize({ width: 390, height: 844 });
        assert.ok(
            await page.evaluate(
                () => document.documentElement.scrollWidth <= innerWidth,
            ),
        );

        record({
            check: "live SDK generation, working preview, Save, isolated Open, session-only key and mobile rendering",
            passed: true,
        });
        await page
            .getByRole("textbox")
            .fill(
                "Build a tiny colourful clock. Cancellation check " +
                    Date.now(),
            );
        const sent = page.waitForRequest(
            (r) => new URL(r.url()).pathname === "/v1/chat/completions",
        );
        await page
            .getByRole("button", { name: "Generate", exact: true })
            .click();
        await sent;
        const aborted = page.waitForEvent("requestfailed", {
            predicate: (r) =>
                new URL(r.url()).pathname === "/v1/chat/completions",
            timeout: 20000,
        });
        await page.getByRole("button", { name: "Stop", exact: true }).click();
        await aborted;
        await page
            .getByRole("button", { name: "Generate", exact: true })
            .waitFor();
        assert.equal(await page.getByRole("alert").count(), 0);
        record({
            check: "cancel aborts the real SDK request without an error",
            passed: true,
        });
        await page
            .getByRole("button", { name: "App user menu", exact: true })
            .click();
        await page
            .getByRole("button", { name: "Disconnect", exact: true })
            .click();
        assert.equal(
            await page.evaluate((key) => sessionStorage.getItem(key), tokenKey),
            null,
        );
        assert.equal(await page.locator("iframe").count(), 0);
        record({
            check: "disconnect clears credentials and generated preview",
            passed: true,
        });
        await context.close();
        const expired = await browser.newContext();
        await expired.addInitScript(
            ({ key, origin }) => {
                if (location.origin === origin)
                    sessionStorage.setItem(key, "sk_invalid_websim_test");
            },
            { key: tokenKey, origin },
        );
        const expiredPage = await expired.newPage();
        await expiredPage.goto(`${origin}/`);
        await expiredPage.waitForFunction(
            (key) => sessionStorage.getItem(key) === null,
            tokenKey,
            { timeout: 30000 },
        );
        record({
            check: "invalid credentials rejected by live API and cleared by SDK",
            passed: true,
        });
        await expired.close();
        fs.mkdirSync(new URL("../test-results/", import.meta.url), {
            recursive: true,
        });
        fs.writeFileSync(
            new URL("../test-results/browser.json", import.meta.url),
            `${JSON.stringify(output, null, 2)}\n`,
        );
    } finally {
        await browser.close();
        fs.rmSync(scratch, { recursive: true, force: true });
    }
})().catch((e) => {
    console.error(
        token ? String(e.stack).replaceAll(token, "[REDACTED]") : e.stack,
    );
    process.exitCode = 1;
});
