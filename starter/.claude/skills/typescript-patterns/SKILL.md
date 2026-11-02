---
name: typescript-patterns
description: Reviews TypeScript code for type safety, idiomatic patterns, common pitfalls, and maintainable API design. Use when writing, reviewing, or refactoring TypeScript.
---

# TypeScript Patterns

Write and review idiomatic, type-safe TypeScript without obscuring runtime behavior.

## Type System
- Prefer precise types; `unknown` over `any` for unvalidated values
- Infer locally; annotate public APIs
- Model variants with discriminated unions; narrow via control flow
- Use `readonly` for immutable state
- Avoid unjustified `!` and `as` assertions
- Validate external data at runtime; TS types are erased

## API Design
- Follow local conventions for `interface` and `type`
- Compose types; avoid duplicated structures
- Keep public parameters and return types precise
- Use generics to preserve input/output relationships; avoid needless complexity
- Model optional, nullable, and absent states explicitly

## Language Patterns
- Prefer `const`; use `let` for reassignment
- Use `as const` to preserve literal types
- Use `?.` and `??` for intentional nullish handling
- Use `import type` when supported
- Follow project module and naming conventions

## Async and Errors
- Prefer `async`/`await`; handle rejections
- Use `Promise.all()` for independent work; account for fail-fast behavior
- Narrow caught values (`unknown`); preserve error context
- Await, return, or explicitly handle every promise

## Pitfalls
- Prefer `===`; handle `NaN` explicitly when relevant
- Do not use `for...in` for arrays
- Check shared mutation, closure capture, `this`, and stale callback state
- Prefer literal unions / `as const` when appropriate to project conventions
- Never treat static types as external-input validation

## Maintainability and Performance
- Prefer readable code over complex type-level machinery
- Avoid redundant work and allocations in hot paths
- Avoid overly broad types that mask errors
- Optimize based on measurement or clear bottlenecks

## Output
- Each finding: `file:line`, severity, issue/impact, minimal TypeScript fix
- Report actionable correctness, type-safety, and maintainability issues only
- State when no actionable issues are found