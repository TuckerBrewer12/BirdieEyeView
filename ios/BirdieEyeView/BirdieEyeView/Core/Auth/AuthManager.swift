import Foundation

@MainActor
final class AuthManager: ObservableObject {
    enum AuthState: Equatable {
        case launching
        case unauthenticated
        case authenticated(AuthUser)
    }

    @Published private(set) var state: AuthState = .launching
    @Published var errorMessage: String?

    var currentUser: AuthUser? {
        if case let .authenticated(user) = state {
            return user
        }
        return nil
    }

    private let tokenStore: TokenStore
    private lazy var apiClient = APIClient(authTokenProvider: { [weak self] in
        self?.tokenStore.readToken()
    })

    init(tokenStore: TokenStore = KeychainTokenStore()) {
        self.tokenStore = tokenStore
    }

    func bootstrap() async {
        await refreshSession(setLaunchingState: true)
    }

    func refreshSession(setLaunchingState: Bool = false) async {
        if setLaunchingState {
            state = .launching
        }

        do {
            let me: AuthUser = try await apiClient.request(path: "/api/auth/me", requiresAuth: true)
            state = .authenticated(me)
            errorMessage = nil
        } catch {
            state = .unauthenticated
            errorMessage = nil
        }
    }

    func login(email: String, password: String) async {
        errorMessage = nil

        do {
            let body = LoginRequest(email: email.trimmingCharacters(in: .whitespacesAndNewlines), password: password)
            let user: AuthUser = try await apiClient.request(path: "/api/auth/login", method: .post, body: body, requiresAuth: false)
            if let token = user.accessToken, !token.isEmpty {
                try tokenStore.saveToken(token)
            }
            state = .authenticated(user)
        } catch {
            errorMessage = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
        }
    }

    func register(name: String, email: String, password: String) async -> String? {
        errorMessage = nil

        do {
            let body = RegisterRequest(
                name: name.trimmingCharacters(in: .whitespacesAndNewlines),
                email: email.trimmingCharacters(in: .whitespacesAndNewlines),
                password: password,
                handicap: nil,
                homeCourseID: nil
            )
            let response: RegisterResponse = try await apiClient.request(path: "/api/auth/register", method: .post, body: body, requiresAuth: false)
            return response.message
        } catch {
            errorMessage = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
            return nil
        }
    }

    func logout() async {
        do {
            try await apiClient.requestEmpty(path: "/api/auth/logout", method: .post, body: EmptyBody(), requiresAuth: true)
        } catch {
            // Continue with local logout even if network logout fails.
        }

        do {
            try tokenStore.clearToken()
        } catch {
            // Keep this non-fatal for UX.
        }

        state = .unauthenticated
        errorMessage = nil
    }
}

private struct EmptyBody: Encodable {}
