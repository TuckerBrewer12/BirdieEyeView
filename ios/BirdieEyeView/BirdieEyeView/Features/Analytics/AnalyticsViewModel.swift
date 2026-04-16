import Foundation

@MainActor
final class AnalyticsViewModel: ObservableObject {
    @Published private(set) var analytics: AnalyticsData?
    @Published private(set) var isLoading = false
    @Published var errorMessage: String?

    private let service: BirdieService
    private var loadedForUserID: String?

    init(service: BirdieService) {
        self.service = service
    }

    func load(userID: String, force: Bool = false) async {
        if isLoading { return }
        if !force, loadedForUserID == userID, analytics != nil { return }

        isLoading = true
        defer { isLoading = false }

        do {
            analytics = try await service.fetchAnalytics(userID: userID, limit: 100)
            loadedForUserID = userID
            errorMessage = nil
        } catch {
            errorMessage = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
        }
    }
}
