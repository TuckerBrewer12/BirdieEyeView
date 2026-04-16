import Foundation

enum APIError: LocalizedError {
    case invalidBaseURL
    case invalidResponse
    case http(statusCode: Int, message: String)
    case decoding(Error)
    case transport(Error)

    var errorDescription: String? {
        switch self {
        case .invalidBaseURL:
            return "API base URL is invalid."
        case .invalidResponse:
            return "Unexpected server response."
        case let .http(_, message):
            return message
        case let .decoding(error):
            return "Failed to decode server response: \(error.localizedDescription)"
        case let .transport(error):
            return error.localizedDescription
        }
    }
}

private struct APIErrorBody: Decodable {
    let detail: String?
}

extension APIError {
    static func fromHTTP(statusCode: Int, data: Data) -> APIError {
        if let payload = try? JSONDecoder().decode(APIErrorBody.self, from: data),
           let detail = payload.detail,
           !detail.isEmpty {
            return .http(statusCode: statusCode, message: detail)
        }

        if let text = String(data: data, encoding: .utf8), !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            return .http(statusCode: statusCode, message: text)
        }

        return .http(statusCode: statusCode, message: "Request failed with status \(statusCode).")
    }
}
