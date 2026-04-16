import SwiftUI

struct AnalyticsView: View {
    @EnvironmentObject private var authManager: AuthManager
    @StateObject var viewModel: AnalyticsViewModel

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                if viewModel.isLoading && viewModel.analytics == nil {
                    ProgressView("Loading analytics...")
                        .frame(maxWidth: .infinity)
                        .padding(.top, 30)
                }

                if let kpis = viewModel.analytics?.kpis {
                    LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                        MetricCard(title: "Scoring Avg", value: Formatting.decimal(kpis.scoringAverage, digits: 1))
                        MetricCard(title: "Handicap", value: Formatting.decimal(kpis.handicapIndex, digits: 1))
                        MetricCard(title: "GIR %", value: Formatting.decimal(kpis.girPercentage, digits: 1))
                        MetricCard(title: "Scramble %", value: Formatting.decimal(kpis.scramblingPercentage, digits: 1))
                        MetricCard(title: "Putts / GIR", value: Formatting.decimal(kpis.puttsPerGIR, digits: 2))
                        MetricCard(title: "Up & Down %", value: Formatting.decimal(kpis.upAndDownPercentage, digits: 1))
                    }

                    MetricCard(
                        title: "Rounds Included",
                        value: "\(kpis.totalRounds)",
                        subtitle: "Analytics calculations are based on your saved rounds"
                    )
                }

                if let error = viewModel.errorMessage {
                    Text(error)
                        .font(.footnote)
                        .foregroundStyle(.red)
                }
            }
            .padding()
        }
        .navigationTitle("Analytics")
        .task {
            if let userID = authManager.currentUser?.userID {
                await viewModel.load(userID: userID)
            }
        }
        .refreshable {
            if let userID = authManager.currentUser?.userID {
                await viewModel.load(userID: userID, force: true)
            }
        }
    }
}
