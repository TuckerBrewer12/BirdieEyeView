import Foundation

@MainActor
final class DashboardViewModel: ObservableObject {
    @Published private(set) var dashboard: DashboardData?
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
        if !force, loadedForUserID == userID, dashboard != nil { return }

        isLoading = true
        defer { isLoading = false }

        do {
            dashboard = try await service.fetchDashboard(userID: userID)
            analytics = try await service.fetchAnalytics(userID: userID, limit: 20)
            loadedForUserID = userID
            errorMessage = nil
        } catch {
            errorMessage = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
        }
    }
}
