import Foundation

@MainActor
final class SettingsViewModel: ObservableObject {
    @Published private(set) var profile: UserProfile?
    @Published private(set) var isLoading = false
    @Published var errorMessage: String?

    private let service: BirdieService

    init(service: BirdieService) {
        self.service = service
    }

    func load(userID: String) async {
        if isLoading { return }
        isLoading = true
        defer { isLoading = false }

        do {
            profile = try await service.fetchUser(userID: userID)
            errorMessage = nil
        } catch {
            errorMessage = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
        }
    }
}
