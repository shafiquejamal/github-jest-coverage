import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { Eye, EyeOff, Github } from "lucide-react";

import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Label } from "./components/ui/label";
import { Keys, get, set } from "./store";

const Popup = () => {
  const [accessToken, setAccessToken] = useState("");
  const [inputType, setInputType] = useState<"password" | "text">("password");

  useEffect(() => {
    get<string>(Keys.GITHUB_ACCESS_TOKEN)
      .then((value) => {
        if (typeof value === "string") {
          setAccessToken(value);
        }
      })
      .catch(() => {
        // ignore missing key on first load
      });
  }, []);

  const save = (reload: boolean) => {
    void set(Keys.GITHUB_ACCESS_TOKEN, accessToken);
    if (reload) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const [tab] = tabs;
        if (tab?.id) {
          chrome.tabs.reload(tab.id);
        }
      });
    }
    window.close();
  };

  return (
    <div className="gradient-surface min-w-[28rem] max-w-xl rounded-xl border border-slate-200 bg-white/95 p-6 shadow-xl backdrop-blur">
      <div className="mb-6 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Github className="h-5 w-5" />
        </span>
        <div className="space-y-0.5">
          <h1 className="text-lg font-semibold text-foreground">
            GitHub Coverage Access
          </h1>
          <p className="text-sm text-muted-foreground">
            Provide a personal access token with repo access to download
            coverage artifacts.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <Label htmlFor="github-token">GitHub Access Token</Label>
        <div className="relative">
          <Input
            id="github-token"
            type={inputType}
            value={accessToken}
            placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
            autoComplete="off"
            onChange={(event) => setAccessToken(event.target.value)}
            className="pr-11"
          />
          <button
            type="button"
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground transition hover:text-foreground"
            onClick={() =>
              setInputType((previous) =>
                previous === "password" ? "text" : "password"
              )
            }
          >
            {inputType === "password" ? (
              <EyeOff className="h-4 w-4" aria-hidden />
            ) : (
              <Eye className="h-4 w-4" aria-hidden />
            )}
            <span className="sr-only">
              {inputType === "password" ? "Show token" : "Hide token"}
            </span>
          </button>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        <Button
          type="button"
          variant="secondary"
          className="flex-1"
          onClick={() => save(false)}
        >
          Save
        </Button>
        <Button type="button" className="flex-1" onClick={() => save(true)}>
          Save & Reload Tab
        </Button>
      </div>

      <p className="mt-6 text-xs leading-relaxed text-muted-foreground">
        We keep your token securely in Chrome&apos;s extension storage and use
        it only to fetch coverage reports. Clear it anytime from the extension
        settings.
      </p>
    </div>
  );
};

const container = document.getElementById("root");
if (container) {
  const root = createRoot(container);
  root.render(
    <StrictMode>
      <Popup />
    </StrictMode>
  );
}
