import {
    Coverage,
    CoverageFile,
    Git,
} from "./git";
import $ from "jquery";

export enum UiMode {
    Inline = "inline",
    Border = "border",
}

export interface PR {
    owner: string;
    repo: string;
    pull: string;
}
export class CoverageLoader {

    coverage: Coverage | undefined = undefined
    coverageShown: boolean = false;
    pr: PR | undefined; 

    constructor(private git: Git, private uiMode: UiMode) {}


    async loadCoverage(url: PR) {

        // const url = this.parseUrl();
        // if (!url) return;

        const {
            owner,
            repo,
            pull
        } = url;

        const coverage = await this.git.getCoverage({
            owner,
            repo,
            pull: Number(pull)
        })
        if (!coverage) {
            console.log("Coverage file not found.")
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
            this.hightlightFile(this.coverage[file], show)
        }
        console.log("UI for coverage updated")
    }

    async highlightLine(line: number, covered: boolean, fileDom: JQuery < Element >, show: boolean) {
        const lineContainer = fileDom.find(`[data-line-number="${line}"]`).parent();
        if (this.uiMode === UiMode.Inline) {
            const lineDom = lineContainer.find(".blob-code-inner");
            if (show) {
                if (covered) {
                    lineDom.addClass("jest-coverage-green")
                } else {
                    lineDom.addClass("jest-coverage-red")
                }
            } else {
                lineDom.removeClass("jest-coverage-green");
                lineDom.removeClass("jest-coverage-red");
            }
        } else {
            const tdDom = lineContainer.find("td.blob-code");
            if (show) {
                if (covered) {
                    tdDom.addClass("jest-coverage-green-border")
                } else {
                    tdDom.addClass("jest-coverage-red-border")
                }
            } else {
                tdDom.removeClass("jest-coverage-green-border")
                tdDom.removeClass("jest-coverage-red-border")
            }
        }
        
    }

    hightlightFile(fileCovereage: CoverageFile, show: boolean) {
        const fileDom = $(`[data-tagsearch-path="${fileCovereage.path}"]`);

        const statmentsBlocks = Object.keys(fileCovereage.statementMap);
        for (let i = 0; i < statmentsBlocks.length; i++) {
            const block = statmentsBlocks[i];
            const statmentBlock = fileCovereage.statementMap[block];
            for (let line = statmentBlock.start.line; line <= statmentBlock.end.line; line++) {
                this.highlightLine(line, fileCovereage.s[block] > 0, fileDom, show);
            }
        }
        const fnBlocks = Object.keys(fileCovereage.fnMap);
        for (let i = 0; i < fnBlocks.length; i++) {
            const block = fnBlocks[i];
            const fnBlock = fileCovereage.fnMap[block];
            this.highlightLine(fnBlock.decl.start.line, fileCovereage.f[block] > 0, fileDom, show);
        }

    }

    parseUrl() {
        const regex = /github\.com\/(.*?)\/(.*?)\/pull\/(.*?)\/files(.*)$/gm;
        const url = window.document.location.href;
        const matches = regex.exec(url);
        if (!matches || matches.length < 4) {
            console.log(`Couldn\'t match ${url} to github pull request files changes page regex.`);
            return null;
        }
        const owner = matches[1];
        const repo = matches[2];
        const pull = matches[3];
        return { owner, repo, pull} as PR;
    }

    setPr(pr: PR) {
        this.pr = pr;
    }
}