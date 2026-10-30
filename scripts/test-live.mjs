import assert from "node:assert/strict";
import { Pollinations } from "@pollinations/sdk";
import { WEB_SIM_MODELS } from "../models.js";
import { extractGeneratedHtml, SYSTEM_PROMPT } from "../src/websim.js";

const token = process.env.POLLINATIONS_API_KEY;
assert.ok(token, "Set POLLINATIONS_API_KEY to run the live generation check");
const client = new Pollinations({ apiKey: token });
await client.accountProfile();
const results = await Promise.allSettled(
    WEB_SIM_MODELS.map(async ({ id: model }) => {
        const reply = await client.text(
            "Create a tiny complete HTML page: a heading reading Websim check and a button that counts clicks. Use inline CSS, no images or external resources. Keep it under 120 lines.",
            {
                model,
                systemPrompt: SYSTEM_PROMPT,
            },
        );
        const html = extractGeneratedHtml(reply);
        assert.match(html, /<html[\s>]/i, `${model}: missing HTML document`);
        assert.match(html, /<\/html>/i, `${model}: incomplete HTML document`);
        assert.match(html, /<button[\s>]/i, `${model}: missing interaction`);
        assert.ok(
            !html.includes(token),
            `${model}: credential in generated HTML`,
        );
        console.log(
            JSON.stringify({
                model,
                passed: true,
                bytes: Buffer.byteLength(html),
            }),
        );
    }),
);
const failures = results.filter((result) => result.status === "rejected");
assert.equal(
    failures.length,
    0,
    failures
        .map((result) =>
            String(result.reason?.message || result.reason).replaceAll(
                token,
                "[REDACTED]",
            ),
        )
        .join("; "),
);
