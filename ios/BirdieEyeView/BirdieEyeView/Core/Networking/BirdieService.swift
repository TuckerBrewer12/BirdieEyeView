import Foundation

@MainActor
final class BirdieService {
    private let client: APIClient

    init(client: APIClient) {
        self.client = client
    }

    func fetchDashboard(userID: String) async throws -> DashboardData {
        try await client.request(path: "/api/stats/dashboard/\(userID)")
    }

    func fetchRounds(userID: String, limit: Int = 100, offset: Int = 0) async throws -> [RoundSummary] {
        try await client.request(
            path: "/api/rounds/user/\(userID)",
            queryItems: [
                URLQueryItem(name: "limit", value: String(limit)),
                URLQueryItem(name: "offset", value: String(offset)),
            ]
        )
    }

    func fetchAnalytics(userID: String, limit: Int = 50) async throws -> AnalyticsData {
        try await client.request(
            path: "/api/stats/analytics/\(userID)",
            queryItems: [
                URLQueryItem(name: "limit", value: String(limit)),
            ]
        )
    }

    func fetchUser(userID: String) async throws -> UserProfile {
        try await client.request(path: "/api/users/\(userID)")
    }
}
