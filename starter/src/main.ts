import * as dotenv from 'dotenv';
import { CodeReviewOrchestrator, OrchestratorOptions } from './orchestrator';
import { ReportGenerator } from './utils/report-generator';

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { RateLimiterConfig } from './utils/rate-limiter';
import { ReviewReport } from './types/report-types';
import { formatError } from './utils';
const moduleDirectory = dirname(fileURLToPath(import.meta.url));

// Load environment variables
dotenv.config();

/**
 * Main entry point for the Claude Multi-Agent Code Review System
 * Usage: npm run dev <owner> <repo> <pr-number>
 */
async function main() {
  const [owner, repo, prStr] = process.argv.slice(2);

  if (!prStr) {
    console.error('Error: Pull request number is required.');
    process.exit(1);
  }

  const prNumber = Number(prStr);

  if (!Number.isSafeInteger(prNumber) || prNumber <= 0) {
    console.error('Error: Pull request number must be a valid integer.');
    process.exit(1);
  }

  if (!owner) {
    console.error('Error: Repository owner is required.');
    process.exit(1);
  }

  if (!repo) {
    console.error('Error: Repository name is required.');
    process.exit(1);
  }

  let useAnthropic = process.env.ANTHROPIC_API_KEY !== undefined;
  let useBedrock = process.env.AWS_ACCESS_KEY_ID !== undefined && process.env.AWS_SECRET_ACCESS_KEY !== undefined;

  if(!useAnthropic && !useBedrock) {
    console.error('Error: Authentication is not configured. Please set either ANTHROPIC_API_KEY for Anthropic API or AWS_ACCESS_KEY_ID + AWS_SECRET_ACCESS_KEY for AWS Bedrock.');
    process.exit(1);
  }

  if (!process.env.ANTHROPIC_MODEL) {
    console.error('Error: ANTHROPIC_MODEL environment variable is required.');
    process.exit(1);
  }

  console.log('start here', owner, repo, prStr)

  let reviewReport: ReviewReport | null = null; 
  try {
    const orchestratorOptions: OrchestratorOptions = {
      max_turns: 20,
      model: process.env.ANTHROPIC_MODEL
    };

    const rateLimiterConfig : RateLimiterConfig = {
      maxConcurrent: 5,
      maxRequestsPerMinute: 60,
      maxTokensPerMinute: 100000,
    };

    const orchestrator = new CodeReviewOrchestrator(orchestratorOptions, rateLimiterConfig);
    reviewReport = await orchestrator.reviewPullRequest(owner, repo, prNumber);
  } catch (error) {
    console.error(`Error: Failed to generate review report. ${formatError(error)}`);
    console.error('Please ensure that credentials are set correctly, required are: GitHub token, owner, repo, and PR number. For more info please check the README.');
    process.exit(1);
  }
  
  const reportsDir = join(moduleDirectory, '../reports');
  try {
    // generate reports
    const reportGenerator = new ReportGenerator();
    const markdownReport = reportGenerator.generateMarkdownReport(reviewReport);
    const htmlReport = reportGenerator.generateHTMLReport(reviewReport);
    const jsonReport = reportGenerator.generateJSONReport(reviewReport);


    await mkdir(reportsDir, { recursive: true });
    const reportFilenameBase = `report_${owner}_${repo}_${prNumber}`;
    
    await writeFile(join(reportsDir, `${reportFilenameBase}.md`), markdownReport);
    await writeFile(join(reportsDir, `${reportFilenameBase}.html`), htmlReport);
    await writeFile(join(reportsDir, `${reportFilenameBase}.json`), jsonReport);

    console.log(`Reports generated and saved to ${reportsDir} with base filename ${reportFilenameBase}`);
  } catch (error) {
    console.error(`Error: Failed to generate or save reports. Please ensure you have correct permissions to write into ${reportsDir}. ${formatError(error)}`);
    process.exit(1);
  }
}

main();
