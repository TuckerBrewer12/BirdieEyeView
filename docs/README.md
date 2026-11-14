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

These guides describe the working tree as of **November 13, 2026**. They do not certify what is deployed. The frontend guides describe the redesigned pages, all on MVVM and the brand kit.

## Maintaining the guides

When changing behavior, update the relevant guide and clearly distinguish implemented behavior from a proposed change. Keep local review notes, planning drafts, and handoff files outside documentation commits unless their inclusion is explicitly requested. See [documentation practices](practices/documentation.md).
