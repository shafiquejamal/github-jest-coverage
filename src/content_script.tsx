import $ from "jquery";
import { Octokit } from "@octokit/rest";
import { CoverageLoader, PR } from "./coverage";
import { get, Keys } from "./store";
import { Git } from "./git";

let coverageLoader: CoverageLoader | undefined;

const init = async (): Promise<void> => {
  try {
    const accessToken = await get<string>(Keys.GITHUB_ACCESS_TOKEN);
    if (!accessToken) {
      return;
    }
    const octokit = new Octokit({ auth: accessToken });
    coverageLoader = new CoverageLoader(new Git(octokit));
  } catch (error) {
    console.info(
      "GitHub access token not set. Please configure it from the popup and refresh."
    );
  }
};

const addFloatContainer = () => {
  if ($("#coberturaFloatContainer").length) return;
  $("body").append(
    `<div id="coberturaFloatContainer" class="form-group cobertura-float-button">Loading...</div>`
  );
};

const removeFloatContainer = () => {
  $("#coberturaFloatContainer").remove();
};

const addFloatSection = () => {
  $("#coberturaFloatContainer").html(`
    <input type="checkbox" id="showCoberturaCoverage" checked>
    <label for="showCoberturaCoverage">Coverage</label>
  `);
  $("#showCoberturaCoverage").on("change", (event) => {
    const checked = (event.currentTarget as HTMLInputElement).checked;
    if (!coverageLoader) return;
    if (checked) {
      coverageLoader.showCoverage();
    } else {
      coverageLoader.hideCoverage();
    }
  });
};

$(document).on("click", () => {
  window.setTimeout(() => {
    if (coverageLoader && coverageLoader.coverageShown) {
      coverageLoader.showCoverage();
    }
  }, 1000);
});

const loadPr = async (pr: PR) => {
  addFloatContainer();
  coverageLoader?.setPr(pr);

  await coverageLoader?.loadCoverage(pr);

  if (coverageLoader?.coverage) {
    addFloatSection();
    coverageLoader.showCoverage();
    return;
  }
  removeFloatContainer();
};

(() => {
  init().then(() => {
    const pr = coverageLoader?.parseUrl();
    if (!pr) {
      return;
    }
    void loadPr(pr);
  });
})();

const checkAndReload = () => {
  if (!coverageLoader) return;
  const pr = coverageLoader.parseUrl(); // get new pr link
  if (!pr) {
    removeFloatContainer();
    return;
  }
  const currentPr = coverageLoader.pr;
  const shouldLoad =
    !currentPr ||
    currentPr.owner !== pr.owner ||
    currentPr.repo !== pr.repo ||
    currentPr.pull !== pr.pull;
  if (shouldLoad) {
    void loadPr(pr);
  }
};

const displayFileCoverage = (fileName: string) => {
  if (!coverageLoader) return;

  coverageLoader.highlightFileName(fileName, true);
};

function pathsFromGithubDiffURL(urlStr: string) {
  const url = new URL(urlStr);
  const pathsParam = url.searchParams.get("paths");
  if (!pathsParam) return [];

  // `pathsParam` is already decoded by URLSearchParams (e.g., "%2F" -> "/").
  return pathsParam
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === "url_update") {
    checkAndReload();
  }

  if (msg.type === "url_request") {
    pathsFromGithubDiffURL(msg.url).forEach((fileName) => {
      displayFileCoverage(fileName);
    });
  }
  sendResponse({});
});
