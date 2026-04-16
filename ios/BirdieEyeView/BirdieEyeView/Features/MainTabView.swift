import SwiftUI

struct MainTabView: View {
    let service: BirdieService

    var body: some View {
        TabView {
            NavigationStack {
                DashboardView(viewModel: DashboardViewModel(service: service))
            }
            .tabItem {
                Label("Dashboard", systemImage: "house")
            }

            NavigationStack {
                RoundsView(viewModel: RoundsViewModel(service: service))
            }
            .tabItem {
                Label("Rounds", systemImage: "list.bullet.rectangle")
            }

            NavigationStack {
                AnalyticsView(viewModel: AnalyticsViewModel(service: service))
            }
            .tabItem {
                Label("Analytics", systemImage: "chart.bar.xaxis")
            }

            NavigationStack {
                ScanView()
            }
            .tabItem {
                Label("Scan", systemImage: "doc.viewfinder")
            }

            NavigationStack {
                MoreView(service: service)
            }
            .tabItem {
                Label("More", systemImage: "ellipsis.circle")
            }
        }
    }
}
