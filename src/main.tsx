import { PolliProvider } from "@pollinations/sdk/react";
import "@pollinations/ui/app.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { ENTER_URL, WEB_SIM_MODELS, WEBSIM_APP_KEY } from "./config";
import "./style.css";
import { normalizeAppUrl } from "./websim.js";

const url = normalizeAppUrl(window.location.href);
if (url.href !== window.location.href) {
    window.history.replaceState(window.history.state, "", url);
}

createRoot(document.getElementById("root") as HTMLElement).render(
    <StrictMode>
        <PolliProvider
            appKey={WEBSIM_APP_KEY}
            enterUrl={ENTER_URL}
            permissions={["profile", "usage"]}
            models={WEB_SIM_MODELS.map((model) => model.id)}
            budget={1}
            storage="sessionStorage"
        >
            <App />
        </PolliProvider>
    </StrictMode>,
);
