import { Coverage, CoverageFile, Git } from "./git";
import $ from "jquery";

export interface PR {
  owner: string;
  repo: string;
  pull: string;
}
export class CoverageLoader {
  coverage: Coverage | undefined = undefined;
  coverageShown: boolean = false;
  pr: PR | undefined;

  constructor(private git: Git) {}

  async loadCoverage(url: PR) {
    // const url = this.parseUrl();
    // if (!url) return;

    const { owner, repo, pull } = url;

    const coverage = await this.git.getCoverage({
      owner,
      repo,
      pull: Number(pull),
    });
    if (!coverage) {
      console.log("Coverage file not found.");
      return;
    }
    this.coverage = coverage;
  }

  showCoverage() {
    this.toggleCoverageUI(true);
  }

  hideCoverage() {
    this.toggleCoverageUI(false);
  }

  async toggleCoverageUI(show: boolean) {
    if (!this.coverage) return;
    this.coverageShown = show;
    const files = Object.keys(this.coverage);
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      this.highlightFile(this.coverage[file], show);
    }
    console.log("UI for coverage updated");
  }

  async highlightLine(
    line: number,
    covered: boolean,
    fileDom: JQuery<Element>,
    show: boolean
  ) {
    const diffAnchor = fileDom.data("diffAnchor");
    if (!diffAnchor) {
      return;
    }

    let tdDom = fileDom.find(`td[data-line-anchor="${diffAnchor}R${line}"]`);
    // const tdDom = lineContainer.find("td.blob-code");
    if (show) {
      if (covered) {
        tdDom.addClass("cobertura-coverage-green-border");
      } else {
        tdDom.addClass("cobertura-coverage-red-border");
      }
    } else {
      tdDom.removeClass("cobertura-coverage-green-border");
      tdDom.removeClass("cobertura-coverage-red-border");
    }
  }

  highlightFileName(fileName: string, show: boolean) {
    if (!this.coverage) {
      console.log("Coverage not loaded");
      return;
    }

    if (!this.coverage[fileName]) {
      console.log("File %s not found in coverage", fileName);
      return;
    }

    this.highlightFile(this.coverage[fileName], show);
  }

  highlightFile(fileCoverage: CoverageFile, show: boolean) {
    // aria-label="Diff for: internal/cli/config/config.go"
    const fileDom = $(`[aria-label="Diff for: ${fileCoverage.path}"]`);
    const statementsBlocks = Object.keys(fileCoverage.statementMap);
    for (let i = 0; i < statementsBlocks.length; i++) {
      const block = statementsBlocks[i];
      const statmentBlock = fileCoverage.statementMap[block];
      for (
        let line = statmentBlock.start.line;
        line <= statmentBlock.end.line;
        line++
      ) {
        this.highlightLine(line, fileCoverage.s[block] > 0, fileDom, show);
      }
    }
    const fnBlocks = Object.keys(fileCoverage.fnMap);
    for (let i = 0; i < fnBlocks.length; i++) {
      const block = fnBlocks[i];
      const fnBlock = fileCoverage.fnMap[block];
      this.highlightLine(
        fnBlock.decl.start.line,
        fileCoverage.f[block] > 0,
        fileDom,
        show
      );
    }
  }

  parseUrl() {
    const regex = /github\.com\/(.*?)\/(.*?)\/pull\/(.*?)\/files(.*)$/gm;
    const url = window.document.location.href;
    const matches = regex.exec(url);
    if (!matches || matches.length < 4) {
      console.log(
        `Couldn\'t match ${url} to github pull request files changes page regex.`
      );
      return null;
    }
    const owner = matches[1];
    const repo = matches[2];
    const pull = matches[3];
    return { owner, repo, pull } as PR;
  }

  setPr(pr: PR) {
    this.pr = pr;
  }
}
