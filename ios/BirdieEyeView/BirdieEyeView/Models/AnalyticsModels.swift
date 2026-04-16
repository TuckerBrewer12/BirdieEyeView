import Foundation

struct AnalyticsData: Codable {
    let kpis: AnalyticsKPIs
}

struct AnalyticsKPIs: Codable {
    let scoringAverage: Double?
    let girPercentage: Double?
    let puttsPerGIR: Double?
    let scramblingPercentage: Double?
    let upAndDownPercentage: Double?
    let handicapIndex: Double?
    let totalRounds: Int

    enum CodingKeys: String, CodingKey {
        case scoringAverage = "scoring_average"
        case girPercentage = "gir_percentage"
        case puttsPerGIR = "putts_per_gir"
        case scramblingPercentage = "scrambling_percentage"
        case upAndDownPercentage = "up_and_down_percentage"
        case handicapIndex = "handicap_index"
        case totalRounds = "total_rounds"
    }
}
