import SwiftUI

@main
struct BirdieEyeViewApp: App {
    @StateObject private var container = AppContainer()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(container)
                .environmentObject(container.authManager)
        }
    }
}
