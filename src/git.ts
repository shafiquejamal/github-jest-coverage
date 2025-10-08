import { Octokit } from "@octokit/rest";
import JSZip from "jszip";

export type Coverage = Record<string, CoverageFile>;

export interface Position {
  line: number;
  column: number | null;
}

export interface Block {
  start: Position;
  end: Position;
}

export interface CoverageFile {
  path: string;
  statementMap: Record<string, Block>;
  branchMap: Record<string, unknown>;
  fnMap: Record<
    string,
    {
      name: string;
      decl: Block;
      loc: Block;
    }
  >;
  s: Record<string, number>;
  f: Record<string, number>;
  b: Record<string, number>;
}

export const parseCoberturaXml = (xmlText: string): Coverage => {
  const coverage: Coverage = {};
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, "application/xml");
  const classNodes = Array.from(doc.getElementsByTagName("class"));

  classNodes.forEach((cls) => {
    const filenameAttr =
      cls.getAttribute("filename") || cls.getAttribute("name") || "";
    if (!filenameAttr) {
      return;
    }

    if (!coverage[filenameAttr]) {
      coverage[filenameAttr] = {
        path: filenameAttr,
        statementMap: {},
        branchMap: {},
        fnMap: {},
        s: {},
        f: {},
        b: {},
      };
    }

    const fileCoverage = coverage[filenameAttr];

    const lineNodes = Array.from(cls.getElementsByTagName("line"));
    lineNodes.forEach((lineNode) => {
      const numberAttr = lineNode.getAttribute("number");
      if (!numberAttr) return;
      const hitsAttr = lineNode.getAttribute("hits") || "0";
      const lineNumber = parseInt(numberAttr, 10);
      if (Number.isNaN(lineNumber)) return;
      const key = String(lineNumber);

      if (!fileCoverage.statementMap[key]) {
        fileCoverage.statementMap[key] = {
          start: { line: lineNumber, column: null },
          end: { line: lineNumber, column: null },
        };
      }

      const incomingHits = parseInt(hitsAttr, 10) || 0;
      const existingHits = fileCoverage.s[key] ?? 0;
      fileCoverage.s[key] = Math.max(existingHits, incomingHits);
    });
  });

  return coverage;
};

export class Git {
  constructor(private readonly octokit: Octokit) {}

  normalizePaths(repo: string, coverage: Coverage): Coverage {
    const updatedCoverage: Coverage = {};
    Object.entries(coverage).forEach(([file, data]) => {
      const index = file.lastIndexOf(repo);
      const path =
        index === -1 ? file : file.substring(index + repo.length + 1);
      updatedCoverage[path] = {
        ...data,
        path,
      };
    });
    return updatedCoverage;
  }

  private buildCoverageCacheKey(
    owner: string,
    repo: string,
    workflowRunId: number
  ) {
    return `coverage_cache:${owner}/${repo}/${workflowRunId}`;
  }

  private async tryReadCoverageFromLocalCache(
    owner: string,
    repo: string,
    workflowRunId: number
  ): Promise<Coverage | null> {
    try {
      // Guard for non-extension/test environments
      if (
        typeof chrome === "undefined" ||
        !chrome.storage ||
        !chrome.storage.local
      ) {
        return null;
      }
      const key = this.buildCoverageCacheKey(owner, repo, workflowRunId);
      return await new Promise((resolve) => {
        chrome.storage.local.get([key], (result) => {
          const stored = result ? result[key] : null;
          if (!stored) {
            resolve(null);
            return;
          }
          try {
            const value =
              typeof stored === "string"
                ? (JSON.parse(stored) as Coverage)
                : (stored as Coverage);
            resolve(value);
          } catch (_error) {
            resolve(null);
          }
        });
      });
    } catch (_e) {
      return null;
    }
  }

  private async tryWriteCoverageToLocalCache(
    owner: string,
    repo: string,
    workflowRunId: number,
    coverage: Coverage
  ): Promise<void> {
    try {
      if (
        typeof chrome === "undefined" ||
        !chrome.storage ||
        !chrome.storage.local
      ) {
        return;
      }
      const key = this.buildCoverageCacheKey(owner, repo, workflowRunId);
      const payload: Record<string, string> = {
        [key]: JSON.stringify(coverage),
      };
      chrome.storage.local.set(payload);
    } catch (_e) {
      // no-op: caching is best-effort
    }
  }

  async getCoverageForRun(
    owner: string,
    repo: string,
    runId: number
  ): Promise<Coverage | null> {
    const job = await this.octokit.rest.actions.getJobForWorkflowRun({
      owner,
      repo,
      job_id: runId,
    });

    const workflowRunId = job.data.run_id;
    const actionsRun = await this.octokit.rest.actions.getWorkflowRun({
      owner,
      repo,
      run_id: workflowRunId,
    });

    // Check local cache by workflow run id before downloading artifacts
    const cached = await this.tryReadCoverageFromLocalCache(
      owner,
      repo,
      actionsRun.data.id
    );
    if (cached) {
      return cached;
    }

    const artifacts = await this.octokit.rest.actions.listWorkflowRunArtifacts({
      owner,
      repo,
      run_id: actionsRun.data.id,
    });

    const coverageArtifact = artifacts.data.artifacts.find((artifact) => {
      const name = artifact.name.toLowerCase();
      return name.includes("coverage") || name.includes("cobertura");
    });

    if (!coverageArtifact) {
      return null;
    }

    const coverageZip = await this.octokit.rest.actions.downloadArtifact({
      owner,
      repo,
      artifact_id: coverageArtifact.id,
      archive_format: "zip",
    });

    const coverage = await JSZip.loadAsync(
      coverageZip.data as ArrayBuffer
    ).then(async (zip) => {
      const jsonDirect = zip.files["coverage-final.json"];
      if (jsonDirect) {
        const content = await jsonDirect.async("text");
        return JSON.parse(content) as Coverage;
      }
      const jsonFallbackKey = Object.keys(zip.files).find((key) => {
        const lower = key.toLowerCase();
        return lower.endsWith(".json") && lower.includes("coverage");
      });
      if (jsonFallbackKey) {
        const content = await zip.files[jsonFallbackKey].async("text");
        return JSON.parse(content) as Coverage;
      }

      const xmlKey = Object.keys(zip.files).find((key) => {
        const lower = key.toLowerCase();
        return (
          lower.endsWith(".xml") &&
          (lower.includes("cobertura") || lower.includes("coverage"))
        );
      });
      if (xmlKey) {
        const xmlText = await zip.files[xmlKey].async("text");
        return parseCoberturaXml(xmlText);
      }
      return null;
    });
    if (coverage) {
      await this.tryWriteCoverageToLocalCache(
        owner,
        repo,
        actionsRun.data.id,
        coverage
      );
    }
    return coverage;
  }

  async getCoverage({
    owner,
    repo,
    pull,
  }: {
    owner: string;
    repo: string;
    pull: number;
  }): Promise<Coverage | null> {
    const pullRequest = await this.octokit.rest.pulls.get({
      owner,
      repo,
      pull_number: pull,
    });
    const checkRuns = await this.octokit.rest.checks.listForRef({
      owner,
      repo,
      ref: pullRequest.data.head.sha,
    });

    const githubActionRuns = checkRuns.data.check_runs.filter(
      (run) => run.app?.slug === "github-actions"
    );

    for (const run of githubActionRuns) {
      const coverage = await this.getCoverageForRun(owner, repo, run.id);
      if (coverage) {
        return this.normalizePaths(repo, coverage);
      }
    }
    return null;
  }
}
