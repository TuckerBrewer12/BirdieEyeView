import Foundation

enum APIConfig {
    static var baseURL: URL {
        guard
            let raw = Bundle.main.object(forInfoDictionaryKey: "APIBaseURL") as? String,
            !raw.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty,
            let url = URL(string: raw.trimmingCharacters(in: .whitespacesAndNewlines))
        else {
            return URL(string: "https://birdieeyeview-production.up.railway.app")!
        }
        return url
    }
}
