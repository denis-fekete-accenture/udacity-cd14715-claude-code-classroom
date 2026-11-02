import { describe, expect, it, vi, beforeEach } from 'vitest';
import { query } from '@anthropic-ai/claude-agent-sdk';
import { CodeReviewOrchestrator } from '../src/orchestrator';
import * as logger from '../src/utils/logger';
import { RateLimiter } from '../src/utils/rate-limiter';
import * as testReports from './test_reports';

vi.mock('@anthropic-ai/claude-agent-sdk', () => ({ query: vi.fn() }));
vi.mock('../src/utils/logger');

// turn an array of messages into the async iterator the SDK returns
async function* stream(messages: unknown[]) {
  for (const m of messages) yield m;
}

const assistantToolUse = (id: string, name: string, input: object) => ({
  type: 'assistant',
  message: { content: [{ type: 'tool_use', id, name, input }] },
});
const toolResult = (id: string) => ({
  type: 'user',
  message: { content: [{ type: 'tool_result', tool_use_id: id }] },
});

describe('CodeReviewOrchestrator', () => {
  describe('Configuration', () => {
    it('should initialize with default options', () => {
      new CodeReviewOrchestrator();
    });

  it('should accept custom configuration', async () => {
    vi.mocked(query).mockReturnValue(stream([
      { type: 'result', subtype: 'success', structured_output: testReports.validReport },
    ]) as any);

    await new CodeReviewOrchestrator({ max_turns: 3, model: 'haiku' })
      .reviewPullRequest('octocat', 'Hello-World', 1);

    const { options } = vi.mocked(query).mock.calls[0]![0] as any;
    expect(options.maxTurns).toBe(3);
    expect(options.model).toBe('haiku');
  });

  it('should apply the supplied rate limiter configuration', async () => {
    vi.mocked(query).mockReset();
    const orchestrator = new CodeReviewOrchestrator(
      {},
      {
        maxRequestsPerMinute: 50,
        maxTokensPerMinute: 9999,
        maxConcurrent: 5,
      },
    );

    await expect(
      orchestrator.reviewPullRequest('octocat', 'Hello-World', 1),
    ).rejects.toThrow('Estimated tokens exceed the configured per-minute limit.');
    expect(query).not.toHaveBeenCalled();
  });

  describe('reviewPullRequest', () => {
    beforeEach(() => vi.mocked(query).mockReset());

    it('should fetch PR files from GitHub MCP', async () => {
      vi.mocked(query).mockReturnValue(stream([
        { type: 'result', subtype: 'success', structured_output: testReports.validReport },
      ]) as any);

      await new CodeReviewOrchestrator().reviewPullRequest('octocat', 'Hello-World', 1);

      const { prompt, options } = vi.mocked(query).mock.calls[0]![0] as any;
      expect(prompt).toContain('octocat');
      expect(prompt).toContain('Hello-World');
      expect(options.allowedTools).toContain('mcp__github__get_pull_request_files');
      expect(options.disallowedTools).toContain('Bash');
    });

    it('should spawn all 3 subagents in parallel', async () => {
      vi.mocked(query).mockReturnValue(stream([
        assistantToolUse('t1', 'Task', { subagent_type: 'code-quality-analyzer', description: 'q' }),
        assistantToolUse('t2', 'Task', { subagent_type: 'test-coverage-analyzer', description: 't' }),
        assistantToolUse('t3', 'Task', { subagent_type: 'refactoring-suggester', description: 'r' }),
        toolResult('t1'), toolResult('t2'), toolResult('t3'),
        { type: 'result', subtype: 'success', structured_output: testReports.validReport },
      ]) as any);

      const report = await new CodeReviewOrchestrator().reviewPullRequest('octocat', 'Hello-World', 1);

      expect(logger.logAgentStart).toHaveBeenCalledTimes(3);
      expect(logger.logAgentComplete).toHaveBeenCalledTimes(3);
      expect(report).toBeDefined();
    });

    it('should aggregate results into ReviewReport', async () => {
      vi.mocked(query).mockReturnValue(stream([
        { type: 'result', subtype: 'success', structured_output: testReports.validReport },
      ]) as any);

      const report = await new CodeReviewOrchestrator().reviewPullRequest('octocat', 'Hello-World', 1);

      expect(report.pullRequest).toEqual(testReports.validReport.pullRequest);
      expect(report.fileReviews).toHaveLength(testReports.validReport.fileReviews.length);
      expect(report.summary.totalFiles).toBe(testReports.validReport.summary.totalFiles);
      expect(report.summary.overallScore).toBe(testReports.validReport.summary.overallScore);
      expect(report.recommendations).toEqual(testReports.validReport.recommendations);
      expect(report.metadata.analyzedAt).toBeTypeOf('string');
      expect(logger.logReviewComplete).toHaveBeenCalledWith(
        'octocat',
        'Hello-World',
        1,
        testReports.validReport.summary.overallScore,
        expect.any(Number),
      );
    });

    it('releases its rate-limit slot when the review completes', async () => {
      vi.mocked(query).mockReturnValue(stream([
        { type: 'result', subtype: 'success', structured_output: testReports.validReport },
      ]) as any);

      const release = vi.spyOn(RateLimiter.prototype, 'release');
      const orchestrator = new CodeReviewOrchestrator();

      await orchestrator.reviewPullRequest('octocat', 'Hello-World', 1);

      expect(release).toHaveBeenCalledOnce();
      release.mockRestore();
    });

    it('throws on a failed result', async () => {
      vi.mocked(query).mockReturnValue(stream([
        { type: 'result', subtype: 'error_max_turns' },
      ]) as any);

      await expect(
        new CodeReviewOrchestrator().reviewPullRequest('octocat', 'Hello-World', 1),
      ).rejects.toThrow('error_max_turns');
    });
  });
  });
});
