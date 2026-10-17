# Landing and public scanner

Route: `/`. Access: Signed out.

Introduces BirdieEyeView and lets a visitor try scanning before creating an account.

## Entry points

- [LandingPage.tsx](../../../frontend/src/pages/public/LandingPage.tsx)
- [HeroSection.tsx](../../../frontend/src/pages/public/sections/HeroSection.tsx)
- [HowItWorksSection.tsx](../../../frontend/src/pages/public/sections/HowItWorksSection.tsx)
- [usePublicScan.ts](../../../frontend/src/hooks/usePublicScan.ts)
- [PublicScanHero.tsx](../../../frontend/src/components/public/PublicScanHero.tsx)

## How it works

LandingPage composes PublicNav, HeroSection, and HowItWorksSection. HeroSection contains an animated demo; HowItWorksSection mounts the interactive PublicScanHero. The public scanner uses its own hook while sharing extraction/report support. App routing switches the same root URL to Dashboard after authentication.

## Boundaries and checks when changing it

Do not assume every section file in the public folder is currently mounted. Preserve anonymous failure reporting and keep private round-saving actions behind the intended account flow. Public theme preferences are separate from signed-in preferences.

These checks describe useful validation scenarios, not a claim that dedicated tests already cover every case. Shared conventions are in [frontend practices](../../practices/frontend.md). Return to the [page index](../README.md).
