import Foundation

struct AuthUser: Codable, Equatable {
    let userID: String
    let name: String
    let email: String
    let emailVerified: Bool
    let accessToken: String?

    enum CodingKeys: String, CodingKey {
        case userID = "user_id"
        case name
        case email
        case emailVerified = "email_verified"
        case accessToken = "access_token"
    }
}

struct LoginRequest: Encodable {
    let email: String
    let password: String
}

struct RegisterRequest: Encodable {
    let name: String
    let email: String
    let password: String
    let handicap: Double?
    let homeCourseID: String?

    enum CodingKeys: String, CodingKey {
        case name
        case email
        case password
        case handicap
        case homeCourseID = "home_course_id"
    }
}

struct MessageResponse: Codable {
    let message: String
}

struct RegisterResponse: Codable {
    let message: String
    let requiresEmailVerification: Bool

    enum CodingKeys: String, CodingKey {
        case message
        case requiresEmailVerification = "requires_email_verification"
    }
}
