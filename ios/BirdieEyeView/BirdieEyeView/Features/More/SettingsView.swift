import SwiftUI

struct SettingsView: View {
    @EnvironmentObject private var authManager: AuthManager
    @StateObject var viewModel: SettingsViewModel

    var body: some View {
        List {
            if let profile = viewModel.profile {
                Section("Profile") {
                    LabeledContent("Name", value: profile.name ?? "—")
                    LabeledContent("Email", value: profile.email ?? "—")
                    LabeledContent("Handicap", value: Formatting.decimal(profile.handicap, digits: 1))
                    LabeledContent("Home Course ID", value: profile.homeCourseID ?? "—")
                }
            }

            Section("App") {
                LabeledContent("API Base URL", value: APIConfig.baseURL.absoluteString)
            }

            if let error = viewModel.errorMessage {
                Section {
                    Text(error)
                        .font(.footnote)
                        .foregroundStyle(.red)
                }
            }
        }
        .navigationTitle("Settings")
        .task {
            if let userID = authManager.currentUser?.userID {
                await viewModel.load(userID: userID)
            }
        }
        .refreshable {
            if let userID = authManager.currentUser?.userID {
                await viewModel.load(userID: userID)
            }
        }
        .overlay {
            if viewModel.isLoading && viewModel.profile == nil {
                ProgressView("Loading settings...")
            }
        }
    }
}
