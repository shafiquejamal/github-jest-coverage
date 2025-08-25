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
      const path = file.substring(index + repo.length + 1); // +1 for the slash
      updatedCoverage[path] = {
        ...coverage[file],
        path: path,
      };
    });
    return updatedCoverage;
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

    const artifacts = await this.octokit.actions.listWorkflowRunArtifacts({
      owner: owner,
      repo: repo,
      run_id: actions_run.id,
    });

    const coverageArtifacts = artifacts.data.artifacts.filter(
      (a) => a.name.includes("coverage") && a.name.includes(".json")
    );

    if (coverageArtifacts.length > 0) {
      const coverageArtifact = coverageArtifacts[0];
      const coveragezip = await this.octokit.actions.downloadArtifact({
        owner,
        repo,
        artifact_id: coverageArtifact.id,
        archive_format: "zip",
      });

      const coverage = await JSZip.loadAsync(coveragezip.data as any).then(
        (zip) => {
          const coverageContent = zip.files["coverage-final.json"];
          return coverageContent
            .async("text")
            .then((content) => JSON.parse(content));
        }
      );
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
}
