import SwiftUI

struct MoreView: View {
    @EnvironmentObject private var authManager: AuthManager
    let service: BirdieService

    var body: some View {
        List {
            Section("Explore") {
                NavigationLink {
                    PlaceholderPageView(
                        title: "Courses",
                        subtitle: "Course search and detail screens are ready to wire next."
                    )
                    .navigationTitle("Courses")
                } label: {
                    Label("Courses", systemImage: "map")
                }

                NavigationLink {
                    PlaceholderPageView(
                        title: "The Lab",
                        subtitle: "Goal optimization and recommendation workflows can live here."
                    )
                    .navigationTitle("The Lab")
                } label: {
                    Label("The Lab", systemImage: "flask")
                }

                NavigationLink {
                    PlaceholderPageView(
                        title: "Career",
                        subtitle: "Long-term tracking and milestones can be surfaced here."
                    )
                    .navigationTitle("Career")
                } label: {
                    Label("Career", systemImage: "trophy")
                }

                NavigationLink {
                    PlaceholderPageView(
                        title: "Social",
                        subtitle: "Friend feed and social interactions can be wired here."
                    )
                    .navigationTitle("Social")
                } label: {
                    Label("Social", systemImage: "person.2")
                }

                NavigationLink {
                    PlaceholderPageView(
                        title: "Inbox",
                        subtitle: "Friend requests and notifications will appear here."
                    )
                    .navigationTitle("Inbox")
                } label: {
                    Label("Inbox", systemImage: "tray")
                }
            }

            Section("Account") {
                NavigationLink {
                    SettingsView(viewModel: SettingsViewModel(service: service))
                } label: {
                    Label("Settings", systemImage: "gear")
                }

                Button(role: .destructive) {
                    Task { await authManager.logout() }
                } label: {
                    Label("Logout", systemImage: "rectangle.portrait.and.arrow.right")
                }
            }
        }
        .navigationTitle("More")
    }
}
