
import type { AgentDefinition } from '@anthropic-ai/claude-agent-sdk';
import { CODE_QUALITY_ANALYZER_PROMPT } from '../prompts';

export const CODE_QUALITY_ANALYZER_AGENT_ID = 'code-quality-analyzer';
export const codeQualityAnalyzer: AgentDefinition = {
  description: 'Reviews a single file for security, performance and maintainability issues. Use for each changed file in a PR.',
  prompt: CODE_QUALITY_ANALYZER_PROMPT,
  tools: [
    'Skill', 
    'mcp__github__get_file_contents',
    'mcp__eslint__lint-files',
  ],
  model: 'inherit',
};

