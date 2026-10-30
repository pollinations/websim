import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_MODEL } from "../models.js";
import {
    extractGeneratedHtml,
    launchOptions,
    normalizeAppUrl,
    previewDocument,
} from "../src/websim.js";

test("legacy prompt links reach the root callback without spending or losing the model", () => {
    const url = normalizeAppUrl(
        "https://websim.pollinations.app/a%20museum%2Fgarden/?model=claude-fast#section",
    );
    assert.equal(url.pathname, "/");
    assert.equal(url.hash, "#section");
    assert.deepEqual(launchOptions(url), {
        prompt: "a museum/garden",
        model: "claude-fast",
    });
    assert.equal(normalizeAppUrl(url).href, url.href);
    assert.deepEqual(
        launchOptions("https://websim.pollinations.app/%E0%A4%A?model=unknown"),
        {
            prompt: "%E0%A4%A",
            model: DEFAULT_MODEL,
        },
    );
    const callback =
        "https://websim.pollinations.app/?code=one-time&state=nonce";
    assert.equal(normalizeAppUrl(callback).href, callback);
    assert.equal(
        normalizeAppUrl("https://websim.pollinations.app/index.html").pathname,
        "/",
    );
});

test("extracts complete HTML and escapes non-HTML model replies", () => {
    const html = "<!doctype html><html><body><h1>Garden</h1></body></html>";
    assert.equal(
        extractGeneratedHtml(
            `Here is your page:\n\`\`\`html\n${html}\n\`\`\`\nEnjoy!`,
        ),
        html,
    );
    const fallback = extractGeneratedHtml('<script>alert("unsafe")</script>');
    assert.ok(fallback.includes("&lt;script&gt;"));
    assert.ok(!fallback.includes("<script>"));
    assert.match(extractGeneratedHtml(""), /No HTML was generated/);
});

test("the full-window preview contains untrusted HTML inside an opaque sandbox", () => {
    const html =
        '</iframe><script>parent.postMessage("escape", "*")</script><p title="quoted">&';
    const preview = previewDocument(html);
    assert.equal((preview.match(/<iframe /g) || []).length, 1);
    assert.equal((preview.match(/<\/iframe>/g) || []).length, 1);
    assert.ok(!preview.includes("<script>"));
    assert.match(
        preview,
        /sandbox="allow-forms allow-modals allow-popups allow-scripts"/,
    );
    assert.ok(!preview.includes("allow-same-origin"));
    assert.ok(preview.includes("&lt;/iframe&gt;"));
    assert.ok(preview.includes("&quot;quoted&quot;"));
});
