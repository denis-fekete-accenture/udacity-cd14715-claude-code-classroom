---
name: security-analysis
description: Analyze source code for security vulnerabilities and unsafe patterns. Use for defensive security reviews, threat analysis, and prioritizing actionable remediation.
---

# Security Analysis

Defensive code review for concrete, actionable security vulnerabilities.

## Review
- Map scope, trust boundaries, data flows, sensitive operations
- Trace untrusted input to sinks; verify validation, authorization, encoding
- Check callers, configuration, tests, and existing mitigations
- Confirm reachability and impact; separate evidence from assumptions
- Prioritize by severity and confidence; omit style-only feedback

## Attack Surface
- AuthN/AuthZ, access control, IDOR
- Injection: SQL, shell, template, code
- XSS, CSRF, input validation, output encoding
- Path traversal, file handling, temporary files
- Unsafe deserialization, open redirects, SSRF
- Secrets exposure; logging and error disclosure
- Cryptography, randomness, transport, storage
- Race conditions, DoS/resource exhaustion, error handling
- Dependency/configuration risks supported by repository evidence

## Safety and Scope
- Defensive scope only: requested code or explicitly authorized assets
- Prefer source inspection and safe local validation; no external probing or exploitation
- No weaponized payloads, exploit chains, or unauthorized-access guidance
- Findings require data flow, missing control, and impact conditions—not pattern matching alone

## Findings
- Format: severity (`Critical`/`High`/`Medium`/`Low`), `file:line`, evidence, preconditions, impact, confidence, remediation
- Sort by severity, then confidence; deduplicate shared root causes
- If none found, state that and note material review limitations