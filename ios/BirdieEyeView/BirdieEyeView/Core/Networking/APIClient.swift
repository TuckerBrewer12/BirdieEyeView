import Foundation

enum HTTPMethod: String {
    case get = "GET"
    case post = "POST"
    case put = "PUT"
    case patch = "PATCH"
    case delete = "DELETE"
}

@MainActor
final class APIClient {
    private let baseURL: URL
    private let session: URLSession
    private let jsonDecoder = JSONDecoder()
    private let jsonEncoder = JSONEncoder()
    private let authTokenProvider: () -> String?

    init(
        baseURL: URL = APIConfig.baseURL,
        session: URLSession = .shared,
        authTokenProvider: @escaping () -> String?
    ) {
        self.baseURL = baseURL
        self.session = session
        self.authTokenProvider = authTokenProvider
    }

    func request<T: Decodable>(
        path: String,
        method: HTTPMethod = .get,
        queryItems: [URLQueryItem] = [],
        body: (any Encodable)? = nil,
        requiresAuth: Bool = true
    ) async throws -> T {
        let request = try makeURLRequest(path: path, method: method, queryItems: queryItems, body: body, requiresAuth: requiresAuth)
        let (data, response): (Data, URLResponse)

        do {
            (data, response) = try await session.data(for: request)
        } catch {
            throw APIError.transport(error)
        }

        guard let http = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }

        guard 200..<300 ~= http.statusCode else {
            throw APIError.fromHTTP(statusCode: http.statusCode, data: data)
        }

        do {
            return try jsonDecoder.decode(T.self, from: data)
        } catch {
            throw APIError.decoding(error)
        }
    }

    func requestEmpty(
        path: String,
        method: HTTPMethod = .post,
        body: (any Encodable)? = nil,
        requiresAuth: Bool = true
    ) async throws {
        let request = try makeURLRequest(path: path, method: method, queryItems: [], body: body, requiresAuth: requiresAuth)
        let (data, response): (Data, URLResponse)

        do {
            (data, response) = try await session.data(for: request)
        } catch {
            throw APIError.transport(error)
        }

        guard let http = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }

        guard 200..<300 ~= http.statusCode else {
            throw APIError.fromHTTP(statusCode: http.statusCode, data: data)
        }
    }

    private func makeURLRequest(
        path: String,
        method: HTTPMethod,
        queryItems: [URLQueryItem],
        body: (any Encodable)?,
        requiresAuth: Bool
    ) throws -> URLRequest {
        let sanitizedPath = path.hasPrefix("/") ? path : "/\(path)"

        guard var components = URLComponents(url: baseURL.appendingPathComponent(sanitizedPath), resolvingAgainstBaseURL: false) else {
            throw APIError.invalidBaseURL
        }

        if !queryItems.isEmpty {
            components.queryItems = queryItems
        }

        guard let url = components.url else {
            throw APIError.invalidBaseURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = method.rawValue
        request.timeoutInterval = 25
        request.setValue("application/json", forHTTPHeaderField: "Accept")

        if requiresAuth, let token = authTokenProvider(), !token.isEmpty {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        if let body {
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.httpBody = try jsonEncoder.encode(AnyEncodable(body))
        }

        return request
    }
}

private struct AnyEncodable: Encodable {
    private let encodeImpl: (Encoder) throws -> Void

    init(_ wrapped: any Encodable) {
        encodeImpl = { encoder in
            try wrapped.encode(to: encoder)
        }
    }

    func encode(to encoder: Encoder) throws {
        try encodeImpl(encoder)
    }
}
