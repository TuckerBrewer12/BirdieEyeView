import SwiftUI

struct DashboardView: View {
    @EnvironmentObject private var authManager: AuthManager
    @StateObject var viewModel: DashboardViewModel

    var body: some View {
        Group {
            if let user = authManager.currentUser {
                content(user: user)
                    .task(id: user.userID) {
                        await viewModel.load(userID: user.userID)
                    }
                    .refreshable {
                        await viewModel.load(userID: user.userID, force: true)
                    }
            } else {
                ProgressView("Loading session...")
            }
        }
        .navigationTitle("Dashboard")
    }

    @ViewBuilder
    private func content(user: AuthUser) -> some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                Text("Welcome back, \(user.name.isEmpty ? "Golfer" : user.name)")
                    .font(.title2)
                    .fontWeight(.bold)

                if viewModel.isLoading && viewModel.dashboard == nil {
                    ProgressView("Loading dashboard...")
                        .frame(maxWidth: .infinity, alignment: .center)
                        .padding(.vertical, 16)
                } else if let dashboard = viewModel.dashboard {
                    LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                        MetricCard(
                            title: "Total Rounds",
                            value: "\(dashboard.totalRounds)",
                            subtitle: "All-time rounds tracked"
                        )
                        MetricCard(
                            title: "Handicap",
                            value: Formatting.decimal(dashboard.handicapIndex, digits: 1),
                            subtitle: "Current index"
                        )
                        MetricCard(
                            title: "Scoring Avg",
                            value: Formatting.decimal(dashboard.scoringAverage, digits: 1),
                            subtitle: "Average score"
                        )
                        MetricCard(
                            title: "Best Round",
                            value: dashboard.bestRound.map(String.init) ?? "—",
                            subtitle: dashboard.bestRoundCourse ?? ""
                        )
                    }

                    if let analytics = viewModel.analytics {
                        VStack(alignment: .leading, spacing: 12) {
                            Text("Quick Performance Snapshot")
                                .font(.headline)
                            HStack {
                                MetricCard(title: "GIR %", value: Formatting.decimal(analytics.kpis.girPercentage, digits: 1))
                                MetricCard(title: "Scramble %", value: Formatting.decimal(analytics.kpis.scramblingPercentage, digits: 1))
                            }
                            HStack {
                                MetricCard(title: "Putts / GIR", value: Formatting.decimal(analytics.kpis.puttsPerGIR, digits: 2))
                                MetricCard(title: "Up & Down %", value: Formatting.decimal(analytics.kpis.upAndDownPercentage, digits: 1))
                            }
                        }
                        .padding(.top, 4)
                    }

                    VStack(alignment: .leading, spacing: 8) {
                        Text("Recent Rounds")
                            .font(.headline)
                        if dashboard.recentRounds.isEmpty {
                            Text("No rounds yet. Start by scanning your first scorecard.")
                                .font(.subheadline)
                                .foregroundStyle(.secondary)
                        } else {
                            ForEach(dashboard.recentRounds) { round in
                                HStack {
                                    VStack(alignment: .leading, spacing: 3) {
                                        Text(round.courseName ?? "Unknown Course")
                                            .font(.subheadline)
                                            .fontWeight(.semibold)
                                        Text(Formatting.displayDate(round.date))
                                            .font(.caption)
                                            .foregroundStyle(.secondary)
                                    }
                                    Spacer()
                                    VStack(alignment: .trailing, spacing: 3) {
                                        Text(round.totalScore.map(String.init) ?? "—")
                                            .font(.headline)
                                        Text(Formatting.toPar(round.toPar))
                                            .font(.caption)
                                            .foregroundStyle(.secondary)
                                    }
                                }
                                .padding(12)
                                .background(Color(.secondarySystemBackground), in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                            }
                        }
                    }
                }

                if let error = viewModel.errorMessage {
                    Text(error)
                        .font(.footnote)
                        .foregroundStyle(.red)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }
            }
            .padding()
        }
    }
}
