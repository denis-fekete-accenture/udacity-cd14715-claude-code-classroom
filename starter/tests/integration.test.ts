import { beforeAll, describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { ReviewReportSchema, type ReviewReport } from '../src/types/report-types';

const OWNER = 'octocat';
const REPO = 'Hello-World';
const PR_NUMBER = 1;

const REPORT_FILE = `reports/report_${OWNER}_${REPO}_${PR_NUMBER}.json`;
const LOG_FILE = 'logs/combined.log';
const HAS_RECORDED_TEST_DATA =
  existsSync(new URL(`./test_data/${REPORT_FILE}`, import.meta.url)) &&
  existsSync(new URL(`./test_data/${LOG_FILE}`, import.meta.url));

async function loadTestData(relativePath: string): Promise<string> {
  try {
    return await readFile(new URL(`./test_data/${relativePath}`, import.meta.url), 'utf8');
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
    throw new Error(
      `Missing recorded run: tests/test_data/${relativePath}\n` +
      `Generate it with a normal run: npm run dev -- ${OWNER} ${REPO} ${PR_NUMBER}\n` +
      `then copy the generated report and logs/combined.log into tests/test_data/ ` +
      `(reports/ and logs/ respectively).`,
    );
  }
}

type LogEntry = { level: string; message: string; owner?: string; repo?: string; prNumber?: number; [key: string]: unknown };

describe.skipIf(!HAS_RECORDED_TEST_DATA).sequential('Integration (recorded runs)', () => {
  let report: ReviewReport;
  let logEntries: LogEntry[];

  beforeAll(async () => {
    const parsed = ReviewReportSchema.safeParse(JSON.parse(await loadTestData(REPORT_FILE)));
    if (!parsed.success) {
      throw new Error('Recorded report does not match ReviewReportSchema');
    }
    report = parsed.data;

    const text = await loadTestData(LOG_FILE);
    logEntries = text.split('\n').filter(Boolean).map((line) => JSON.parse(line) as LogEntry);
    if (logEntries.length === 0) {
      throw new Error('Recorded log is empty');
    }
  });

  it('should have a report that is consistent with the reviewed PR', () => {
    expect(report.pullRequest).toEqual({ owner: OWNER, repo: REPO, number: PR_NUMBER });
    expect(report.fileReviews.length).toBeGreaterThan(0);
    expect(report.summary.totalFiles).toBe(report.fileReviews.length);
  });

  it('should have a recorded log entry that matches the report', () => {
    const forPr = logEntries.filter(
      (e) => e.owner === OWNER && e.repo === REPO && e.prNumber === PR_NUMBER,
    );
    expect(
      forPr.some((e) => e.message === 'Starting code review'),
      `no start entry for ${OWNER}/${REPO}#${PR_NUMBER} in ${LOG_FILE}`,
    ).toBe(true);

    const completed = forPr.filter((e) => e.message === 'Code review completed').at(-1);
    expect(completed, `no completion entry for ${OWNER}/${REPO}#${PR_NUMBER} in ${LOG_FILE}`).toBeDefined();
    expect(completed!.status).toBe('success');
    expect(completed!.score).toBe(report!.summary.overallScore);
  });

  it('should have logged all 3 subagents starting and completing', () => {
    const agents = ['code-quality-analyzer', 'test-coverage-analyzer', 'refactoring-suggester'];
    for (const agent of agents) {
      const events = logEntries.filter((e) => e.agent === agent).map((e) => e.message);
      expect(events, `subagent ${agent}`).toContain('Subagent starting');
      expect(events, `subagent ${agent}`).toContain('Subagent completed');
    }
  });
});