import Foundation

enum Formatting {
    static func displayDate(_ raw: String?) -> String {
        guard let raw, !raw.isEmpty else { return "—" }
        if let d = parseISODate(raw) {
            return displayFormatter().string(from: d)
        }
        return raw
    }

    static func toPar(_ value: Int?) -> String {
        guard let value else { return "—" }
        if value == 0 { return "E" }
        return value > 0 ? "+\(value)" : "\(value)"
    }

    static func decimal(_ value: Double?, digits: Int = 1) -> String {
        guard let value else { return "—" }
        return String(format: "%.*f", digits, value)
    }

    private static func parseISODate(_ raw: String) -> Date? {
        let withFraction = ISO8601DateFormatter()
        withFraction.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let parsed = withFraction.date(from: raw) {
            return parsed
        }

        let noFraction = ISO8601DateFormatter()
        noFraction.formatOptions = [.withInternetDateTime]
        return noFraction.date(from: raw)
    }

    private static func displayFormatter() -> DateFormatter {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .none
        return formatter
    }
}
