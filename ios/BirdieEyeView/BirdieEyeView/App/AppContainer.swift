import Foundation

@MainActor
final class AppContainer: ObservableObject {
    let authManager: AuthManager
    let service: BirdieService

    init() {
        let tokenStore = KeychainTokenStore()
        let auth = AuthManager(tokenStore: tokenStore)
        authManager = auth

        let client = APIClient(authTokenProvider: {
            tokenStore.readToken()
        })
        service = BirdieService(client: client)
    }
}
