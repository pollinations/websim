import { DEFAULT_MODEL, WEB_SIM_MODELS } from "../models.js";

export const INITIAL_PROMPT =
    "A tiny interactive museum for impossible plants, with a collection wall, specimen cards, and a night mode.";

/** Keep old prompt links usable with the registered root OAuth callback. */
export function normalizeAppUrl(input) {
    const url = new URL(input);
    if (url.pathname !== "/") {
        if (url.pathname !== "/index.html") {
            const encoded = url.pathname.slice(1).replace(/\/$/, "");
            let prompt;
            try {
                prompt = decodeURIComponent(encoded);
            } catch {
                prompt = encoded;
            }
            url.searchParams.set("prompt", prompt);
        }
        url.pathname = "/";
    }
    return url;
}

export function launchOptions(input) {
    const url = normalizeAppUrl(input);
    const model = url.searchParams.get("model");
    return {
        prompt: url.searchParams.get("prompt")?.trim() || INITIAL_PROMPT,
        model:
            WEB_SIM_MODELS.find((item) => item.id === model)?.id ||
            DEFAULT_MODEL,
    };
}

export const PREVIEW_SANDBOX =
    "allow-forms allow-modals allow-popups allow-scripts";

/** The full-window preview has the same opaque origin as the inline preview. */
export function previewDocument(html) {
    return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Websim preview</title><body style="margin:0"><iframe title="Generated Websim page" sandbox="${PREVIEW_SANDBOX}" srcdoc="${escapeHtml(html)}" style="display:block;width:100%;height:100dvh;border:0"></iframe></body></html>`;
}

export const SYSTEM_PROMPT = `You are an HTML generator. Your task is to return a single, complete HTML file that implements what the user asks for.
The HTML should be valid, self-contained, and ready to be rendered in a browser.

Follow the Plain Vanilla Web approach:
- No build tools, no frameworks - just HTML, CSS, JavaScript
- Everything in a single HTML file
- Browser-native technologies only

Implementation patterns:
- CSS: inline in <style>, use CSS variables (--var), component-scoped selectors
- JS: Web Components (class extends HTMLElement), connectedCallback for initialization
- External libs: CDN imports, ES modules with import maps where needed

Include all necessary CSS inline within a <style> tag in the head section.
Include all necessary JavaScript within <script> tags, preferably at the end of the body.
Make the design clean, modern, and responsive.
Write the code in a sequence that lets the browser already render something meaningful while it is being transmitted.
Imagine you are coding for a demoscene challenge where code should be short and elegant.
Use CSS and inline SVG for illustrations. Do not embed API keys or rely on authenticated image-generation URLs.
Do not create links to generated subpages. Keep navigation within this single HTML file using anchors, buttons, tabs, details/summary, dialogs, or other browser-native interactions.
You are targeting modern browsers.
Include a descriptive page title and description.`;

export function extractGeneratedHtml(value) {
    const content = String(value || "").trim();
    if (!content) {
        return renderGeneratedFallback("No HTML was generated.");
    }

    const withoutFence = content
        .replace(/^```html\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/```$/i, "")
        .trim();
    const lower = withoutFence.toLowerCase();
    const htmlIndex = lower.indexOf("<html");

    if (htmlIndex === -1) {
        return renderGeneratedFallback(withoutFence);
    }

    const doctypeIndex = lower.lastIndexOf("<!doctype", htmlIndex);
    const start = doctypeIndex === -1 ? htmlIndex : doctypeIndex;
    const endIndex = lower.indexOf("</html>", htmlIndex);
    if (endIndex === -1) {
        return withoutFence.slice(start);
    }

    return withoutFence.slice(start, endIndex + "</html>".length);
}

function renderGeneratedFallback(content) {
    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Websim</title>
</head>
<body>
<pre>${escapeHtml(content)}</pre>
</body>
</html>`;
}

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}
