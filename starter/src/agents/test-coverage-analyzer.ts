
import type { AgentDefinition } from '@anthropic-ai/claude-agent-sdk';
import { TEST_COVERAGE_ANALYZER_PROMPT } from '../prompts';

export const TEST_COVERAGE_ANALYZER_AGENT_ID = 'test-coverage-analyzer';
export const testCoverageAnalyzer: AgentDefinition = {
  description: `Analyzes and evaluates the test coverage of the codebase and 
  provides a structured report based on the defined JSON schema alongside 
  suggestions for specific test cases. Do not provide any refactoring suggestions.`,
  prompt: TEST_COVERAGE_ANALYZER_PROMPT,
  tools: [
    'Skill', 
    'mcp__github__get_file_contents',
  ],
  model: 'inherit',
};

