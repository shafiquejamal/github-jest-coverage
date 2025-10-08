import { Octokit } from "@octokit/rest";
import { Coverage, Git, parseCoberturaXml } from "./git";

class OctokitStub {}

const buildGit = () => new Git(new OctokitStub() as unknown as Octokit);

describe("Git.normalizePaths", () => {
  test("strips repo prefix when present", () => {
    const git = buildGit();
    const coverage = {
      "/home/runner/work/my-repo/my-repo/src/file.ts": {
        path: "/home/runner/work/my-repo/my-repo/src/file.ts",
        statementMap: {
          "1": {
            start: { line: 1, column: null },
            end: { line: 1, column: null },
          },
        },
        branchMap: {},
        fnMap: {},
        s: { "1": 1 },
        f: {},
        b: {},
      },
    } satisfies Coverage;
    const normalized = git.normalizePaths("my-repo", coverage);
    expect(Object.keys(normalized)).toEqual(["src/file.ts"]);
    expect(normalized["src/file.ts"].path).toBe("src/file.ts");
  });

  test("keeps original path when repo segment is missing", () => {
    const git = buildGit();
    const coverage = {
      "src/file.ts": {
        path: "src/file.ts",
        statementMap: {},
        branchMap: {},
        fnMap: {},
        s: {},
        f: {},
        b: {},
      },
    } satisfies Coverage;
    const normalized = git.normalizePaths("my-repo", coverage);
    expect(Object.keys(normalized)).toEqual(["src/file.ts"]);
    expect(normalized["src/file.ts"].path).toBe("src/file.ts");
  });
});

describe("Git.parseCoberturaXml", () => {
  test("parses class lines into statementMap and s counts", () => {
    const git = buildGit();
    const xml = `<?xml version="1.0" ?>
<coverage>
  <packages>
    <package name="pkg">
      <classes>
        <class name="src/file.ts" filename="src/file.ts">
          <lines>
            <line number="10" hits="0"/>
            <line number="11" hits="3"/>
          </lines>
        </class>
      </classes>
    </package>
  </packages>
</coverage>`;
    const parsed = parseCoberturaXml(xml);
    expect(parsed["src/file.ts"]).toBeDefined();
    const file = parsed["src/file.ts"];
    expect(file.path).toBe("src/file.ts");
    expect(file.statementMap["10"]).toEqual({
      start: { line: 10, column: null },
      end: { line: 10, column: null },
    });
    expect(file.statementMap["11"]).toEqual({
      start: { line: 11, column: null },
      end: { line: 11, column: null },
    });
    expect(file.s["10"]).toBe(0);
    expect(file.s["11"]).toBe(3);
  });

  test("merges duplicate class entries and prefers max hits for same line", () => {
    const git = buildGit();
    const xml = `<?xml version="1.0" ?>
<coverage>
  <packages>
    <package name="pkg">
      <classes>
        <class name="src/file.ts" filename="src/file.ts">
          <lines>
            <line number="10" hits="0"/>
            <line number="20" hits="1"/>
          </lines>
        </class>
        <class name="src/file.ts" filename="src/file.ts">
          <lines>
            <line number="10" hits="2"/>
            <line number="30" hits="0"/>
          </lines>
        </class>
      </classes>
    </package>
  </packages>
</coverage>`;
    const parsed = parseCoberturaXml(xml);
    const file = parsed["src/file.ts"];
    expect(Object.keys(file.statementMap).sort()).toEqual(["10", "20", "30"]);
    expect(file.s["10"]).toBe(2); // max of 0 and 2
    expect(file.s["20"]).toBe(1);
    expect(file.s["30"]).toBe(0);
  });

  test("includes method-nested lines under <methods><method><lines>", () => {
    const git: any = buildGit();
    const xml = `<?xml version="1.0" ?>
<coverage>
  <packages>
    <package name="pkg">
      <classes>
        <class name="src/file2.ts" filename="src/file2.ts">
          <methods>
            <method name="Foo" signature="">
              <lines>
                <line number="100" hits="5"/>
                <line number="101" hits="0"/>
              </lines>
            </method>
          </methods>
        </class>
      </classes>
    </package>
  </packages>
</coverage>`;
    const parsed = parseCoberturaXml(xml);
    const file = parsed["src/file2.ts"];
    expect(file).toBeDefined();
    expect(file.s["100"]).toBe(5);
    expect(file.s["101"]).toBe(0);
    expect(file.statementMap["100"]).toEqual({
      start: { line: 100, column: null },
      end: { line: 100, column: null },
    });
    expect(file.statementMap["101"]).toEqual({
      start: { line: 101, column: null },
      end: { line: 101, column: null },
    });
  });
});
