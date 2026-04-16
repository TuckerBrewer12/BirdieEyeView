import SwiftUI

struct RoundsView: View {
    @EnvironmentObject private var authManager: AuthManager
    @StateObject var viewModel: RoundsViewModel

    var body: some View {
        List {
            if let error = viewModel.errorMessage {
                Text(error)
                    .font(.footnote)
                    .foregroundStyle(.red)
            }

            if viewModel.isLoading && viewModel.rounds.isEmpty {
                ProgressView("Loading rounds...")
            }

            ForEach(viewModel.rounds) { round in
                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(round.courseName ?? "Unknown Course")
                            .font(.headline)
                        Text(Formatting.displayDate(round.date))
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                    Spacer()
                    VStack(alignment: .trailing, spacing: 4) {
                        Text(round.totalScore.map(String.init) ?? "—")
                            .font(.title3)
                            .fontWeight(.semibold)
                        Text(Formatting.toPar(round.toPar))
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
                .padding(.vertical, 4)
            }

            if !viewModel.isLoading && viewModel.rounds.isEmpty {
                Text("No rounds found yet.")
                    .foregroundStyle(.secondary)
            }
        }
        .listStyle(.insetGrouped)
        .navigationTitle("Rounds")
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
