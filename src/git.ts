import { Octokit } from "@octokit/rest";
import JSZip from "jszip";

export interface Coverage {
  [file: string]: CoverageFile;
}

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
  statementMap: {
    [block: string]: Block;
  };
  branchMap: {};
  fnMap: {
    [block: string]: {
      name: string;
      decl: Block;
      loc: Block;
    };
  };
  s: {
    [block: string]: number;
  };
  f: {
    [block: string]: number;
  };
  b:
    | {
        [block: string]: number;
      }
    | {};
}

export class Git {
  constructor(private octokit: Octokit) {}

  normalizePaths(repo: string, coverage: Coverage) {
    let updatedCoverage: Coverage = {};
    Object.keys(coverage).forEach((file) => {
      const index = file.lastIndexOf(repo);
      const path =
        index === -1 ? file : file.substring(index + repo.length + 1); // +1 for the slash
      updatedCoverage[path] = {
        ...coverage[file],
        path: path,
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
        chrome.storage.local.get([key], (result: any) => {
          const stored = result ? result[key] : null;
          if (!stored) {
            resolve(null);
            return;
          }
          try {
            // Support both raw object and stringified JSON
            const value =
              typeof stored === "string" ? JSON.parse(stored) : stored;
            resolve(value as Coverage);
          } catch (_e) {
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
      const payload: any = {};
      // Store as string to be conservative about serialization
      payload[key] = JSON.stringify(coverage);
      chrome.storage.local.set(payload, () => {});
    } catch (_e) {
      // no-op: caching is best-effort
    }
  }

  async getCoverageForRun(owner: string, repo: string, runId: number) {
    const job = (
      await this.octokit.rest.actions.getJobForWorkflowRun({
        owner: owner,
        repo: repo,
        job_id: runId,
      })
    ).data;

    const actions_run = (
      await this.octokit.rest.actions.getWorkflowRun({
        owner: owner,
        repo: repo,
        run_id: job.run_id,
      })
    ).data;

    // Check local cache by workflow run id before downloading artifacts
    const cached = await this.tryReadCoverageFromLocalCache(
      owner,
      repo,
      actions_run.id
    );
    if (cached) {
      return cached;
    }

    const artifacts = await this.octokit.actions.listWorkflowRunArtifacts({
      owner: owner,
      repo: repo,
      run_id: actions_run.id,
    });

    const coverageArtifacts = artifacts.data.artifacts.filter((a) => {
      const name = a.name.toLowerCase();
      return name.includes("coverage") || name.includes("cobertura");
    });

    if (coverageArtifacts.length > 0) {
      const coverageArtifact = coverageArtifacts[0];
      const coveragezip = await this.octokit.actions.downloadArtifact({
        owner,
        repo,
        artifact_id: coverageArtifact.id,
        archive_format: "zip",
      });

      const coverage = await JSZip.loadAsync(coveragezip.data as any).then(
        async (zip) => {
          // Try JSON first (coverage-final.json or any coverage*.json)
          const jsonDirect = zip.files["coverage-final.json"];
          if (jsonDirect) {
            const content = await jsonDirect.async("text");
            return JSON.parse(content);
          }
          const jsonFallbackKey = Object.keys(zip.files).find((k) => {
            const lower = k.toLowerCase();
            return lower.endsWith(".json") && lower.includes("coverage");
          });
          if (jsonFallbackKey) {
            const content = await zip.files[jsonFallbackKey].async("text");
            return JSON.parse(content);
          }

          // Try Cobertura XML (cobertura.xml or any *.xml containing cobertura/coverage)
          const xmlKey = Object.keys(zip.files).find((k) => {
            const lower = k.toLowerCase();
            if (!lower.endsWith(".xml")) return false;
            return lower.includes("cobertura") || lower.includes("coverage");
          });
          if (xmlKey) {
            const xmlText = await zip.files[xmlKey].async("text");
            return this.parseCoberturaXml(xmlText);
          }
          return null;
        }
      );
      if (coverage) {
        // Best-effort write to cache for subsequent loads
        await this.tryWriteCoverageToLocalCache(
          owner,
          repo,
          actions_run.id,
          coverage
        );
      }
      return coverage;
    }
    return null;
  }

  async getCoverage({
    owner,
    repo,
    pull,
  }: {
    owner: string;
    repo: string;
    pull: number;
  }) {
    const pullRequest = (
      await this.octokit.rest.pulls.get({ owner, repo, pull_number: pull })
    ).data;
    const check_runs = (
      await this.octokit.rest.checks.listForRef({
        owner,
        repo,
        ref: pullRequest.head.sha,
      })
    ).data.check_runs;

    const githubActionRuns = check_runs.filter(
      (run) => run.app?.slug === "github-actions"
    );
    // check all artifacts
    for (let i = 0; i < githubActionRuns.length; i++) {
      const run = githubActionRuns[i];
      const coverage = await this.getCoverageForRun(owner, repo, run.id);
      if (!coverage) {
        continue;
      }
      return this.normalizePaths(repo, coverage);
    }
    return null;
  }

  private parseCoberturaXml(xmlText: string): Coverage {
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

      // Ensure file bucket exists so we can merge across duplicate class nodes
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

      // Collect all descendant <line> nodes, including those under <methods><method><lines>
      const lineNodes = Array.from(cls.getElementsByTagName("line"));
      lineNodes.forEach((lineNode) => {
        const numberAttr = lineNode.getAttribute("number");
        if (!numberAttr) return;
        const hitsAttr = lineNode.getAttribute("hits") || "0";
        const lineNumber = parseInt(numberAttr, 10);
        if (Number.isNaN(lineNumber)) return;
        const key = String(lineNumber);

        // Ensure a statement entry exists for this exact line
        if (!fileCoverage.statementMap[key]) {
          fileCoverage.statementMap[key] = {
            start: { line: lineNumber, column: null },
            end: { line: lineNumber, column: null },
          };
        }

        // Merge hits, preferring the maximum when duplicate entries are seen
        const incomingHits = parseInt(hitsAttr, 10) || 0;
        const existingHits = (fileCoverage.s as any)[key] || 0;
        (fileCoverage.s as any)[key] = Math.max(existingHits, incomingHits);
      });
    });

    return coverage;
  }
}
