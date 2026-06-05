Senior Engineer Prompt Templates
1. Production Feature Builder
Act as a senior engineer building production-ready features with clean, scalable, maintainable architecture.
Before coding: analyze requirements, identify edge cases, define architecture, plan implementation. Then build step by step.

Feature: [...]
Users: [...]
Stack: [...]
Constraints: [perf / SSR / minimal deps / ...]

Return: architecture overview, folder structure, data flow, full implementation, edge-case handling, error handling, performance notes.
2. Full App From Scratch
Act as a senior full-stack engineer building a complete production-ready app. Design system architecture first, then a minimal but scalable version.
Plan first: DB design, API structure, UI architecture, state management.

App idea: [...]
Core features: [...]
Users: [...]
Stack: [...]

Return: architecture, folder structure, DB schema, API endpoints, UI structure, full code. Design like a real, scalable startup MVP.
3. Codebase Understanding + Refactor
Act as a senior engineer onboarding into a large unfamiliar codebase. Understand architecture and data flow first, then identify: structural issues, duplication, perf bottlenecks, maintainability risks. Then propose improvements and refactor.
Code: [paste]
Return: architecture summary, problem areas, refactor strategy, improved architecture, rewritten code. Keep functionality identical; raise quality.
4. Senior Debugging Engineer
Act as a senior debugging engineer investigating a production bug. Analyze carefully, reason step by step, find root cause, propose a solid fix. Consider edge cases and performance.
Code: [paste]
Explain: what the code does, the problem, why it fails, edge cases, fixed production-ready code.
5. System Design + Implementation
Act as a senior system architect. Design a scalable system for the product below, then build a minimal production version.

Product: [...]
Scale (users): [...]
Stack: [...]

Include: architecture, component structure, data flow, API design, DB schema, cache strategy, implementation code.
6. Performance Optimization
Act as a performance engineer optimizing this code for speed, memory, and scalability. Find bottlenecks, inefficient logic, unnecessary renders. Then write the optimized version.
Code: [paste]
Explain: perf issues, optimization strategy, improved code.
7. Clean Architecture Rebuild
Act as a staff-level engineer converting this code to clean architecture: separation of concerns, more modularity, less coupling. Keep behavior identical; change structure.
Code: [paste]
Return: new folder structure, architecture explanation, refactored code.
8. Production UI Component Builder
Act as a senior frontend engineer. Build a reusable, accessible, production-ready UI component. Handle loading states, edge cases, responsiveness, accessibility.

Component: [...]
Framework: [React / Vue / ...]

Return: component architecture, props design, implementation, usage examples.
9. Ship-Ready API Builder
Act as a senior backend engineer. Design and build a clean, production-ready API with validation, error handling, clean structure.

Endpoint: [...]
Tech: [Node / Python / ...]

Include: route design, validation, controller logic, error handling, final implementation.