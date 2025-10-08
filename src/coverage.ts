import $ from "jquery";
import { Coverage, CoverageFile, Git } from "./git";

export interface PR {
  owner: string;
  repo: string;
  pull: string;
}
export class CoverageLoader {
  #coverage: Coverage | undefined;
  #coverageShown = false;
  #pr: PR | undefined;

  constructor(private readonly git: Git) {}

  get coverage(): Coverage | undefined {
    return this.#coverage;
  }

  get coverageShown(): boolean {
    return this.#coverageShown;
  }

  get pr(): PR | undefined {
    return this.#pr;
  }

  async loadCoverage(pr: PR): Promise<void> {
    const { owner, repo, pull } = pr;
    const coverage = await this.git.getCoverage({
      owner,
      repo,
      pull: Number(pull),
    });

    if (!coverage) {
      console.info("Coverage file not found.");
      return;
    }

    this.#coverage = coverage;
  }

  showCoverage(): void {
    void this.toggleCoverageUI(true);
  }

  hideCoverage(): void {
    void this.toggleCoverageUI(false);
  }

  async toggleCoverageUI(show: boolean): Promise<void> {
    if (!this.#coverage) {
      return;
    }

    this.#coverageShown = show;
    const files = Object.values(this.#coverage);
    files.forEach((file) => this.highlightFile(file, show));
  }

  highlightLine(
    line: number,
    covered: boolean,
    fileDom: JQuery<Element>,
    show: boolean
  ): void {
    const diffAnchor = fileDom.data("diffAnchor");
    if (!diffAnchor) {
      return;
    }

    const tdDom = fileDom.find(`td[data-line-anchor="${diffAnchor}R${line}"]`);
    if (show) {
      tdDom.toggleClass("cobertura-coverage-green-border", covered);
      tdDom.toggleClass("cobertura-coverage-red-border", !covered);
      return;
    }

    tdDom.removeClass("cobertura-coverage-green-border cobertura-coverage-red-border");
  }

  highlightFileName(fileName: string, show: boolean): void {
    if (!this.#coverage) {
      console.info("Coverage not loaded");
      return;
    }

    const fileCoverage = this.#coverage[fileName];
    if (!fileCoverage) {
      console.info("File %s not found in coverage", fileName);
      return;
    }

    this.highlightFile(fileCoverage, show);
  }

  highlightFile(fileCoverage: CoverageFile, show: boolean): void {
    const fileDom = $(`table[aria-label~="${fileCoverage.path}"]`);

    Object.entries(fileCoverage.statementMap).forEach(([block, segment]) => {
      for (let line = segment.start.line; line <= segment.end.line; line += 1) {
        this.highlightLine(line, fileCoverage.s[block] > 0, fileDom, show);
      }
    });

    Object.entries(fileCoverage.fnMap).forEach(([block, fnBlock]) => {
      this.highlightLine(
        fnBlock.decl.start.line,
        fileCoverage.f[block] > 0,
        fileDom,
        show
      );
    });
  }

  parseUrl(): PR | null {
    const regex = /github\.com\/(.*?)\/(.*?)\/pull\/(.*?)\/files(.*)$/;
    const url = window.document.location.href;
    const matches = regex.exec(url);
    if (!matches || matches.length < 4) {
      console.info(
        `Could not match ${url} to GitHub pull request files changes page regex.`
      );
      return null;
    }
    const [owner, repo, pull] = matches.slice(1, 4);
    return { owner, repo, pull } satisfies PR;
  }

  setPr(pr: PR | undefined): void {
    this.#pr = pr;
  }
}
