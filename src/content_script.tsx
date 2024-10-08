import { CoverageLoader, PR, UiMode } from "./coverage";
import $ from "jquery";
import { Octokit } from '@octokit/rest'; 
import * as store from './store';
import { Git } from "./git";

console.log("Jest Coverage Script Loaded");

let coverageLoader: CoverageLoader;

const init = async () => {
  const accessToken = await store.get(store.Keys.GITHUB_ACCESS_TOKEN).catch((err) => {
    console.log("Github access token not set. Please set it from the popup screen and refresh.")
    return "";
  })
  if (!accessToken) return;
  const uiMode: UiMode = await store.get(store.Keys.UI_MODE).catch((err) => {
    return UiMode.Border;
  }) as any;
  const octokit = new Octokit({ auth: accessToken });
  coverageLoader = new CoverageLoader(new Git(octokit), uiMode);
}

const addFloatContainer = () => {
  if($("#jestFloatContainer").length) return;
  $("body").append(`<div id="jestFloatContainer" class="form-group jest-float-button">Loading...</div>`);
}

const removeFloatContainer = () => {
  $("#jestFloatContainer").remove()
}

const addFloatSection = () => {
  $("#jestFloatContainer").html(`
    <input type="checkbox" id="showJestCoverage" checked>
    <label for="showJestCoverage">Coverage</label>
  `);
  $("#showJestCoverage").on("change", function(){
    const checked = (this as any).checked;
    if (checked) {
      coverageLoader.showCoverage()
    } else {
      coverageLoader.hideCoverage()
    }
  })
}

$(document).on("click", function() { 
  setTimeout(() => {
    // refresh ui
    if (coverageLoader && coverageLoader.coverageShown) {
      coverageLoader.showCoverage()
    }
  }, 1000);
});

const loadPr = (pr: PR) => {
  addFloatContainer();
  coverageLoader.setPr(pr);
  coverageLoader.loadCoverage(pr).then(() => {
    if (coverageLoader.coverage) {
      addFloatSection();
      coverageLoader.showCoverage()
    } else {
      removeFloatContainer()
    }
  });
}

(() => {
  init().then(() => {
    const pr = coverageLoader.parseUrl()
    if (!pr) {
      return;
    }
    loadPr(pr);
  })
})()


const checkAndReload = () => {
  if (!coverageLoader) return;
  const pr = coverageLoader.parseUrl(); // get new pr link
  if (!pr) {
    removeFloatContainer();
    return;
  }
  let currentPr = coverageLoader.pr;
  const shoudLoad = !currentPr || (currentPr.owner != pr.owner || currentPr.repo != pr.repo || currentPr.pull != pr.pull);
  if (shoudLoad) {
    console.log("loading new pr");
    loadPr(pr);
  }
};

chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
  if (msg.type == "url_update") {
    checkAndReload();
  }
  sendResponse({});
});