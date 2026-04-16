import Foundation

@MainActor
final class RoundsViewModel: ObservableObject {
    @Published private(set) var rounds: [RoundSummary] = []
    @Published private(set) var isLoading = false
    @Published var errorMessage: String?

    private let service: BirdieService
    private var loadedForUserID: String?

    init(service: BirdieService) {
        self.service = service
    }

    func load(userID: String, force: Bool = false) async {
        if isLoading { return }
        if !force, loadedForUserID == userID, !rounds.isEmpty { return }

        isLoading = true
        defer { isLoading = false }

        do {
            rounds = try await service.fetchRounds(userID: userID, limit: 100)
            loadedForUserID = userID
            errorMessage = nil
        } catch {
            errorMessage = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
        }
    }
}
