---
project_name: 'bakery-web'
user_name: 'hieu'
date: '2026-04-04T00:00:00+07:00'
sections_completed: ['technology_stack']
existing_patterns_found: 14
---

# Project Context for AI Agents

_This file contains critical rules and patterns that AI agents must follow when implementing code in this project. Focus on unobvious details that agents might otherwise miss._

---

## Technology Stack & Versions

_Documented after discovery phase_

## Critical Implementation Rules

_Documented after discovery phase_

## Backend-Frontend Sync Rules

- Every backend/API change must include a frontend impact check in the same story.
- If contract changed:
  - update endpoint/type definitions,
  - verify all service/hook/component call sites,
  - add route-level tests for changed handlers.
- If no UI currently consumes the capability, create an explicit follow-up item in sprint/deferred tracking before closing the story.
