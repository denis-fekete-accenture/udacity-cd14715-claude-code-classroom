---
name: python-code-review
description: Review Python code for correctness, modern best practices, common pitfalls, performance, and security issues
---

# Python Code Review

Review Python code for defects and actionable improvements; follow project conventions.

## Checklist
- Correctness: behavior, edge cases, callers, tests
- Style: PEP 8, descriptive names, f-strings, `pathlib`
- Typing: annotate public APIs; prefer precise types
- Iteration: idiomatic comprehensions, `enumerate()`, `zip()`
- Data models: `dataclass` or suitable standard-library types

## Runtime Patterns
- Async I/O: `async`/`await`; no blocking calls in event loop
- Concurrency: `asyncio.gather()` for independent tasks; handle failures
- Resources: `with` / `async with`
- Defaults: avoid mutable defaults; initialize from `None`
- Exceptions: narrow catches; no swallowed errors
- Identity: `is None`; values: `==`
- Closures: check late binding; do not mutate iterables during iteration
- Entry points: guard scripts with `if __name__ == "__main__":`

## Performance and Security
- Select appropriate algorithms and built-in data structures
- Avoid redundant work, copies, and I/O; profile before complex optimization
- Use generators for large streams where beneficial
- SQL: parameterized queries
- Untrusted input: no `eval()`, `exec()`, or unsafe `pickle`
- Subprocesses: validate arguments; avoid `shell=True`
- Protect secrets; do not log sensitive data

## Output
- Each finding: `file:line`, severity, issue, impact, minimal fix
- Include code examples only when they clarify the fix
- Report actionable findings only; state when none are found