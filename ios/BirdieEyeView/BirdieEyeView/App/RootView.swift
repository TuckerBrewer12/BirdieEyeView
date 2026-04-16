import SwiftUI

struct RootView: View {
    @EnvironmentObject private var container: AppContainer
    @EnvironmentObject private var authManager: AuthManager

    var body: some View {
        Group {
            switch authManager.state {
            case .launching:
                ProgressView("Loading BirdieEyeView...")
                    .task {
                        await authManager.bootstrap()
                    }
            case .unauthenticated:
                AuthGateView()
            case .authenticated:
                MainTabView(service: container.service)
            }
        }
        .animation(.easeInOut(duration: 0.2), value: authManager.state)
    }
}
