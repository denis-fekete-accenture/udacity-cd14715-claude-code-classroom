# Enterprise Multi-Agent Code Review Orchestrator

Build a production-ready multi-agent system that automates code review using the Claude Agent SDK.

## Project Overview

This system uses multiple specialized AI agents working together to provide comprehensive code reviews:

- **Main Orchestrator** - Coordinates the review process and aggregates results
- **Code Quality Analyzer** - Identifies code smells, anti-patterns, and best practice violations
- **Test Coverage Analyzer** - Evaluates test completeness and suggests missing test cases
- **Refactoring Suggester** - Recommends architectural improvements and refactoring opportunities

## Setup and Usage instructions

### Prerequisites

- Node.js 18+
- Anthropic API access (provided in Vocareum workspace) or [your own API key](https://console.anthropic.com/)
- [GitHub Personal Access Token](https://github.com/settings/tokens) (recommended - scopes: `repo`, `read:org`)

### Environment Variables
- Copy the `.env.example` file to `.env` and fill in the required environment variables:

  ```bash
  cp .env.example .env
  ```

  Required environment variables:
  - `ANTHROPIC_API_KEY` (if using Anthropic)
  - `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` (if using AWS Bedrock)
  - `ANTHROPIC_MODEL` (specify the model to use with Anthropic)
  - `GITHUB_TOKEN` (your GitHub Personal Access Token)
  - `ANTHROPIC_MODEL` (select one from the commented models)
  - `LOG_LEVEL` (set to `debug` for start/end of subagents, `info` for normal)

### Usage
- Install dependencies:

  ```bash
  npm install
  ```

- Build the project:
  ```bash
  npm run build
  ```

- Run the project:
  ```bash
  npm run dev -- <GITHUB_OWNER> <REPOSITORY> <PULL_REQUEST_NUMBER>
  ```

- Run the tests:
  - *Note: The tests rely on recorded test data located in `tests/test_data/`. Ensure you have generated this data by running the project with `npm run dev -- octocat Hello-World 1` and copy generated `reports/` and `logs/combined.log` into `tests/test_data/`.*

  ```bash
  npm test
  ```
  
  - Without previous runs being copied into `tests/test_data/` a total of `23` tests should pass and `3` tests should be skipped. With the recorded test data inside the `tests/test_data/` all `26` tests should pass successfully.

### Generated reports
- `reports/` directory contains the JSON, Markdown and HTML reports generated for each reviewed pull request.
```bash
npm run dev -- udacity cd14715-simple-todo-app 1

npm run dev -- udacity cd14715-simple-todo-app 2

npm run dev -- udacity cd14715-simple-todo-app 3
``` 
- Total of 9 files are bundled with this project (3 files per pull request) inside the `reports/` directory.
- Furthermore the `logs/combined.log` file contains the aggregated logs for all pull request reviews, useful for debugging and tracing the execution flow of the project. These runs were executed with env `LOG_LEVEL` set to `info` *(runs were not rerun with `debug` again to avoid wasting API resources)*.
- More detailed runs can be found in `tests/test_data/` which contains the recorded test data, including the `reports/` and `logs/combined.log` files for each pull request review with `LOG_LEVEL` set to `debug`.