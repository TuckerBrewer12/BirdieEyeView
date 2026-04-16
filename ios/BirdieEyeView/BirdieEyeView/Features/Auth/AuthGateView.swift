import SwiftUI

struct AuthGateView: View {
    enum Mode: String, CaseIterable, Identifiable {
        case login = "Sign In"
        case register = "Create Account"

        var id: String { rawValue }
    }

    @EnvironmentObject private var authManager: AuthManager
    @State private var mode: Mode = .login

    var body: some View {
        NavigationStack {
            VStack(spacing: 20) {
                VStack(spacing: 8) {
                    Text("BirdieEyeView")
                        .font(.system(size: 34, weight: .bold, design: .rounded))
                    Text("Track rounds. See trends. Improve faster.")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
                .padding(.top, 40)

                Picker("Mode", selection: $mode) {
                    ForEach(Mode.allCases) { item in
                        Text(item.rawValue).tag(item)
                    }
                }
                .pickerStyle(.segmented)

                if mode == .login {
                    LoginView()
                } else {
                    RegisterView()
                }

                if let error = authManager.errorMessage, !error.isEmpty {
                    Text(error)
                        .font(.footnote)
                        .foregroundStyle(.red)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }

                Spacer()
            }
            .padding(.horizontal, 20)
            .navigationBarHidden(true)
        }
    }
}

private struct LoginView: View {
    @EnvironmentObject private var authManager: AuthManager
    @State private var email = ""
    @State private var password = ""
    @State private var working = false

    var body: some View {
        VStack(spacing: 12) {
            TextField("Email", text: $email)
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()
                .keyboardType(.emailAddress)
                .padding(12)
                .background(.thinMaterial, in: RoundedRectangle(cornerRadius: 12))

            SecureField("Password", text: $password)
                .padding(12)
                .background(.thinMaterial, in: RoundedRectangle(cornerRadius: 12))

            Button {
                Task {
                    working = true
                    await authManager.login(email: email, password: password)
                    working = false
                }
            } label: {
                HStack {
                    if working {
                        ProgressView().tint(.white)
                    }
                    Text(working ? "Signing In..." : "Sign In")
                        .fontWeight(.semibold)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 12)
            }
            .buttonStyle(.borderedProminent)
            .disabled(working || email.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || password.isEmpty)
        }
    }
}

private struct RegisterView: View {
    @EnvironmentObject private var authManager: AuthManager
    @State private var name = ""
    @State private var email = ""
    @State private var password = ""
    @State private var statusMessage: String?
    @State private var working = false

    var body: some View {
        VStack(spacing: 12) {
            TextField("Name", text: $name)
                .padding(12)
                .background(.thinMaterial, in: RoundedRectangle(cornerRadius: 12))

            TextField("Email", text: $email)
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()
                .keyboardType(.emailAddress)
                .padding(12)
                .background(.thinMaterial, in: RoundedRectangle(cornerRadius: 12))

            SecureField("Password (8+ chars)", text: $password)
                .padding(12)
                .background(.thinMaterial, in: RoundedRectangle(cornerRadius: 12))

            Button {
                Task {
                    working = true
                    statusMessage = await authManager.register(name: name, email: email, password: password)
                    working = false
                }
            } label: {
                HStack {
                    if working {
                        ProgressView().tint(.white)
                    }
                    Text(working ? "Creating Account..." : "Create Account")
                        .fontWeight(.semibold)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 12)
            }
            .buttonStyle(.borderedProminent)
            .disabled(working || name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || email.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || password.count < 8)

            if let statusMessage, !statusMessage.isEmpty {
                Text(statusMessage)
                    .font(.footnote)
                    .foregroundStyle(.green)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
    }
}
