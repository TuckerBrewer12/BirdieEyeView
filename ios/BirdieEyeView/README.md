# BirdieEyeView iOS (SwiftUI)

Native iPhone app scaffold for BirdieEyeView, built with SwiftUI and generated with XcodeGen.

## Included Tonight

- Native auth flow (sign in + register)
- Keychain token persistence
- API client wired to backend (`/api/auth`, `/api/stats`, `/api/rounds`, `/api/users`)
- Main tab shell with:
  - Dashboard
  - Rounds
  - Analytics
  - Scan (starter screen)
  - More (includes Settings + Logout + section links)
- Basic unit tests

## Setup

```bash
cd ios/BirdieEyeView
xcodegen generate
open BirdieEyeView.xcodeproj
```

## API Base URL

`BirdieEyeView/Resources/Info.plist` contains:

- `APIBaseURL` (default: `https://birdieeyeview-production.up.railway.app`)

Change this if backend URL changes.

## Next Pass Suggestions

1. Full scan pipeline (`PhotosPicker` / camera + upload endpoints)
2. Round detail editing
3. Course search + details
4. Social/inbox endpoints and interactions
5. Production polish: crash logging, analytics, richer offline handling
