import Foundation

struct DashboardData: Codable {
    let totalRounds: Int
    let scoringAverage: Double?
    let bestRound: Int?
    let bestRoundID: String?
    let bestRoundCourse: String?
    let handicapIndex: Double?
    let recentRounds: [RoundSummary]
    let averagePutts: Double?
    let averageGIR: Double?

    enum CodingKeys: String, CodingKey {
        case totalRounds = "total_rounds"
        case scoringAverage = "scoring_average"
        case bestRound = "best_round"
        case bestRoundID = "best_round_id"
        case bestRoundCourse = "best_round_course"
        case handicapIndex = "handicap_index"
        case recentRounds = "recent_rounds"
        case averagePutts = "average_putts"
        case averageGIR = "average_gir"
    }
}

struct RoundSummary: Codable, Identifiable {
    let id: String
    let courseID: String?
    let courseName: String?
    let date: String?
    let totalScore: Int?
    let toPar: Int?
    let totalPutts: Int?

    enum CodingKeys: String, CodingKey {
        case id
        case courseID = "course_id"
        case courseName = "course_name"
        case date
        case totalScore = "total_score"
        case toPar = "to_par"
        case totalPutts = "total_putts"
    }
}

struct UserProfile: Codable {
    let id: String?
    let name: String?
    let email: String?
    let homeCourseID: String?
    let handicap: Double?

    enum CodingKeys: String, CodingKey {
        case id
        case name
        case email
        case homeCourseID = "home_course_id"
        case handicap
    }
}
