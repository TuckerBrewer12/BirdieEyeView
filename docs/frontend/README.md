# Frontend guides

The frontend is React + TypeScript, built with Vite, with React Query for server state and Capacitor for the native shell. Routes are defined in [App.tsx](../../frontend/src/App.tsx).

Start with [frontend architecture](architecture.md), [shared UI and the brand kit](shared-ui.md), and [frontend coding practices](../practices/frontend.md).

## Signed-in pages

| Page | Route | Guide |
|---|---|---|
| Dashboard | `/` | [dashboard.md](pages/dashboard.md) |
| Rounds | `/rounds` | [rounds.md](pages/rounds.md) |
| Round detail | `/rounds/:roundId` | [round-detail.md](pages/round-detail.md) |
| Courses and course detail | `/courses`, `/courses/:courseId` | [courses.md](pages/courses.md) |
| Scan | `/scan` | [scan.md](pages/scan.md) |
| Analytics (Profile is the old Lab) | `/analytics`, `/the-lab` | [analytics.md](pages/analytics.md) |
| Career | `/career` | [career.md](pages/career.md) |
| Social and Requests | `/social`, `/inbox` | [social.md](pages/social.md) |
| Settings | `/settings` | [settings.md](pages/settings.md) |

## Public/account pages

| Page | Route | Guide |
|---|---|---|
| Landing and try it | `/` when signed out | [landing.md](pages/landing.md) |
| Sign in | `/login` | [login.md](pages/login.md) |
| Create account | `/register` | [register.md](pages/register.md) |
| Check your email | `/verify-pending` | [verify-pending.md](pages/verify-pending.md) |
| Verify email | `/verify-email` | [verify-email.md](pages/verify-email.md) |
| Reset password | `/forgot-password` | [forgot-password.md](pages/forgot-password.md) |
| New password | `/reset-password` | [reset-password.md](pages/reset-password.md) |

The developer-only `/__brand__/:story` harness is described in [shared UI](shared-ui.md). It is a development surface rather than a customer page.
