
import type { AgentDefinition } from '@anthropic-ai/claude-agent-sdk';
import { REFACTORING_SUGGESTER_PROMPT } from '../prompts';

export const REFACTORING_SUGGESTER_AGENT_ID = 'refactoring-suggester';
export const refactoringSuggester: AgentDefinition = {
  description: `Analyzes the codebase identifies opportunities to improve code 
  quality, code structure, and modernization of code patterns through 
  refactoring suggestions. Subagent does not provide any test coverage analysis or code analysis.`,
  prompt: REFACTORING_SUGGESTER_PROMPT,
  tools: [
    'Skill', 
    'mcp__github__get_file_contents',
  ],
  model: 'inherit',
};

