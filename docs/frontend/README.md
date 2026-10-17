# Frontend guides

The frontend is React + TypeScript, built with Vite, with React Query for server state and Capacitor for the native shell. Routes are defined in [App.tsx](../../frontend/src/App.tsx).

Start with [frontend architecture](architecture.md), [shared UI and themes](shared-ui.md), and [frontend coding practices](../practices/frontend.md).

## Signed-in pages

| Page | Route | Guide |
|---|---|---|
| Dashboard | `/` | [dashboard.md](pages/dashboard.md) |
| Rounds | `/rounds` | [rounds.md](pages/rounds.md) |
| Round detail | `/rounds/:roundId` | [round-detail.md](pages/round-detail.md) |
| Courses | `/courses` | [courses.md](pages/courses.md) |
| Scan | `/scan` | [scan.md](pages/scan.md) |
| Analytics | `/analytics` | [analytics.md](pages/analytics.md) |
| The Lab | `/the-lab` | [the-lab.md](pages/the-lab.md) |
| Career | `/career` | [career.md](pages/career.md) |
| Social | `/social` | [social.md](pages/social.md) |
| Friends inbox | `/inbox` | [friends-inbox.md](pages/friends-inbox.md) |
| Settings | `/settings` | [settings.md](pages/settings.md) |

## Public/account pages

| Page | Route | Guide |
|---|---|---|
| Landing and public scanner | `/` when signed out | [landing.md](pages/landing.md) |
| Login | `/login` | [login.md](pages/login.md) |
| Registration | `/register` | [register.md](pages/register.md) |
| Verification pending | `/verify-pending` | [verify-pending.md](pages/verify-pending.md) |
| Email verification | `/verify-email` | [verify-email.md](pages/verify-email.md) |
| Forgot password | `/forgot-password` | [forgot-password.md](pages/forgot-password.md) |
| Reset password | `/reset-password` | [reset-password.md](pages/reset-password.md) |

The developer-only `/__brand__/:story` harness is described in [shared UI](shared-ui.md). It is a development surface rather than a customer page.

## Refactor status

Dashboard, Analytics, Career, and The Lab use shared view-model hooks with responsive layouts. Rounds colocates its page, typed view-model hook, and screenshot tests under `pages/RoundsPage/` and uses the brand kit. Other pages retain some inline state and requests. Document those actual differences rather than assuming a single format has already been applied everywhere.
