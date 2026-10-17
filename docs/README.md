# BirdieEyeView documentation

This is the shared starting point for understanding and changing the project. `docs/` sits beside `api/`, `models/`, `services/`, and `frontend/` at the repository root.

## Start here

| Guide | What it explains |
|---|---|
| [Architecture](architecture.md) | The application flow and responsibility boundaries. |
| [Backend domains](backend/README.md) | A guide for each backend source area. |
| [Frontend pages](frontend/README.md) | Routing, shared frontend infrastructure, and a guide for each page. |
| [Coding practices](practices/README.md) | Backend and frontend structure, testing, and documentation conventions. |
| [Failed-scan reports](failed-scan-reports.md) | Storage, privacy, encryption, developer retrieval, and operational commands. |
| [Running the app](../README.md#running-the-app) | Local setup and startup commands. |
| [Deployment security](../SECURITY_DEPLOYMENT.md) | Production configuration and security guidance. |

## Current implementation versus refactor direction

These guides describe the inspected working tree as of **October 17, 2026**. They do not certify what is deployed. The backend model refactor is local work awaiting cross-domain integration. The frontend has both view-model-based pages and older pages with inline orchestration. Each guide identifies relevant differences; a proposed convention is not evidence that every file follows it.

## Existing reviews and plans

Detailed findings remain at their current paths so ongoing work can continue referencing them. General explanations live here; issue evidence and unresolved decisions remain in the reviews.

- [Backend consistency index](<../1. Fix backend consistency issues.md>)
- [Models review](<../1. Fix backend consistency issues - Models.md>)
- [API review](<../1. Fix backend consistency issues - API.md>)
- [Analytics review](<../1. Fix backend consistency issues - Analytics.md>)
- [Services review](<../1. Fix backend consistency issues - Services.md>)
- [Backend architecture planning](<../3. Backend architecture refactor.md>)
- [Project handoff](../handoff.md)

When changing behavior, update the relevant guide and record an unresolved decision in the review rather than silently documenting it as settled. See [documentation practices](practices/documentation.md).
