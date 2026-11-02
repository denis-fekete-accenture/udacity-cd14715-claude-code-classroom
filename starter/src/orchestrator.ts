import { ReviewReport, ReviewReportJSONSchema, ReviewReportSchema } from './types/report-types';
import { query, AgentDefinition, McpServerConfig } from "@anthropic-ai/claude-agent-sdk";
import { ORCHESTRATOR_PROMPT } from './prompts/orchestrator.prompt'
import { mcpServersConfig, MCPServersConfig } from './config/mcp.config';
import * as agents from './agents';
import * as logger from './utils/logger';
import { RateLimiter, RateLimiterConfig } from './utils/rate-limiter';
/**
 * Orchestrator configuration options
 */
export interface OrchestratorOptions {
  max_turns: number,
  model: string,
  /** MCP servers available to the orchestrator; replaces the defaults when provided */
  mcpConfig?: MCPServersConfig,
}

/**
 * Main Code Review Orchestrator
 * Coordinates subagents to analyze pull requests and generate comprehensive reports
 */
export class CodeReviewOrchestrator {
  private options: OrchestratorOptions;
  private subagents: Record<string, AgentDefinition>;
  private rateLimiter: RateLimiter;

  constructor(
    options: Partial<OrchestratorOptions> = {},
    rateLimiterConfig?: RateLimiterConfig
  ) {
    this.options = {
      max_turns: 10,
      model: 'sonnet',
      mcpConfig: mcpServersConfig,
      ...options,
    };
    this.rateLimiter = new RateLimiter(rateLimiterConfig);

    this.subagents = {
      [agents.TEST_COVERAGE_ANALYZER_AGENT_ID]: agents.testCoverageAnalyzer,
      [agents.CODE_QUALITY_ANALYZER_AGENT_ID]: agents.codeQualityAnalyzer,
      [agents.REFACTORING_SUGGESTER_AGENT_ID]: agents.refactoringSuggester
    };
  }

  /**
   * Review a pull request using parallel subagent analysis
   * @param owner - Repository owner
   * @param repo - Repository name
   * @param prNumber - Pull request number
   * @returns Complete review report
   */
  async reviewPullRequest(
    owner: string,
    repo: string,
    prNumber: number
  ): Promise<ReviewReport> {
    const runningAgents = new Map<string, { agent: string; description: string; startedAt: number }>();

    await this.rateLimiter.acquire(10000);
    try {
      return await this.processReviewMessages(
        runningAgents,
        owner,
        repo,
        prNumber,
      );
    } catch (err) {
      logger.logReviewError(owner, repo, prNumber, err as Error);
      throw err;
    } finally {
      this.rateLimiter.release();
    }
  }

  private async processReviewMessages(
    runningAgents: Map<string, { agent: string; description: string; startedAt: number }>,
    owner: string,
    repo: string,
    prNumber: number,
  ): Promise<ReviewReport> {
    const startedAt = Date.now();
    logger.logReviewStart(owner, repo, prNumber);

    const queryIterator = this.getQueryIterator(owner, repo, prNumber);


    for await (const message of queryIterator) {
      if (message.type === "assistant") {
        const content = message.message?.content;

        if (Array.isArray(content)) {
          for (const block of content) {
            if (block.type === "tool_use" && block.name === "Task") {
              const input = block.input as { description?: string; subagent_type?: string };
              const agent = input.subagent_type ?? "unknown";
              const description = input.description ?? "task";

              runningAgents.set(block.id, { agent, description, startedAt: Date.now() });
              logger.logAgentStart(agent, description);
            }
          }
        }
      } else if (message.type === "user") {
        const content = message.message?.content;
        if (Array.isArray(content)) {
          for (const block of content) {
            if (block.type === "tool_result") {
              const running = runningAgents.get(block.tool_use_id);

              if (running) {
                logger.logAgentComplete(running.agent, running.description, Date.now() - running.startedAt);
                runningAgents.delete(block.tool_use_id);
              }
            }
          }
        }
      } else if (
        message.type === "result" &&
        message.subtype === "success" &&
        message.structured_output
      ) {
        /**
         * Code taken from:
         * https://code.claude.com/docs/en/agent-sdk/structured-outputs#with-structured-outputs
         */
        const parsed = ReviewReportSchema.safeParse(message.structured_output);

        if (!parsed.success) {
          logger.logReviewError(owner, repo, prNumber, 
            new Error(`Review failed: ${message.subtype}`));
          throw new Error("Failed to parse review report");
        }

        logger.logReviewComplete(owner, repo, prNumber, parsed.data.summary.overallScore, Date.now() - startedAt);
        return parsed.data;
      } else if (message.type === "result") {
        logger.logReviewError(owner, repo, prNumber, 
          new Error(`Review failed: ${message.subtype}`));
        throw new Error(`Review failed: ${message.subtype}`);
      }
    }

    throw new Error("Failed to generate repository review report");
  }

  private getQueryIterator(
    owner: string,
    repo: string,
    prNumber: number) {
    return query({
      prompt: `${ORCHESTRATOR_PROMPT}
        # IMPORTANT
        - Do not make up any information that is not present in the code being analyzed.
        - If any required information is missing or cannot be determined from the code, explicitly indicate it in your output.
        
        # Repository Information:
        - Owner: ${owner}
        - Repository: ${repo}
        - Pull Request: ${prNumber}`,
      options: {
        mcpServers: this.options.mcpConfig,
        allowedTools: [
          "Skill",
          "Task", 
          "mcp__github__get_file_contents", 
          "mcp__github__get_pull_request",
          "mcp__github__get_pull_request_files",
          "mcp__eslint__lint-files"
        ],
        disallowedTools: [
          "Read",
          "Glob",
          "Grep",
          "Bash",
          "WebFetch",
          "WebSearch",
          "Write",
          "Edit"
        ],
        settingSources: ['project'],
        agents: this.subagents,
        model: this.options.model,
        outputFormat: {
          type: "json_schema",
          schema: ReviewReportJSONSchema,
        },
        maxTurns: this.options.max_turns,
        permissionMode: "dontAsk", // do not ask for permissions, use only allowed tools
      },
    });
  }
}
