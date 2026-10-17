# Coding practices

These guides make responsibilities and review expectations visible while the frontend and backend refactors proceed.

| Guide | Scope |
|---|---|
| [Shared practices](shared.md) | Readability, ownership, contracts, and refactor discipline. |
| [Backend practices](backend.md) | Routers, workflows, models, analytics, persistence, and Python tooling. |
| [Frontend practices](frontend.md) | Page/view-model structure, shared UI, state, and TypeScript tooling. |
| [Testing](testing.md) | Focused checks, integration boundaries, and live evaluations. |
| [Documentation](documentation.md) | Keeping explanations, decisions, and review findings current. |

## How to interpret these guides

**Existing convention** means a pattern or tool configuration verified in the current checkout. **Refactor direction** describes how the team is trying to improve responsibility boundaries; it does not mean all existing code already complies. **Unconfirmed** choices need the owner to settle them before a broad mechanical migration.

The user's approved model decisions remain recorded in the [Models review](<../../1. Fix backend consistency issues - Models.md>). The frontend guide is grounded in the checked-in [MVVM review rules](../../.github/review-bots/mvvm.md) and [brand-kit review rules](../../.github/review-bots/brand-kit.md), which name RoundsPage as the reference. Remaining folder-wide migration choices are marked explicitly. These documents do not introduce a formatter configuration or approve a new application behavior.
