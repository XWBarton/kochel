import Foundation
import Observation

private let serverURLKey = "serverURLString"
private let defaultServerURLString = "http://localhost:8000"

/// UserDefaults is the actual source of truth (thread-safe, Sendable) so
/// non-isolated code like APIClient can read it directly. AppSettings is a
/// thin @MainActor observable façade over it, purely for SwiftUI binding in
/// the Settings screen.
enum ServerConfig {
    static var urlString: String {
        UserDefaults.standard.string(forKey: serverURLKey) ?? defaultServerURLString
    }

    /// Server address is a runtime setting, not a compile-time constant — this
    /// is a self-hosted app pointed at whatever server the user runs.
    /// Defaults to localhost, which resolves to the host Mac in Simulator.
    static var apiRoot: URL {
        URL(string: urlString)?.appendingPathComponent("api/v1")
            ?? URL(string: "\(defaultServerURLString)/api/v1")!
    }
}

@MainActor
@Observable
final class AppSettings {
    static let shared = AppSettings()

    var serverURLString: String {
        didSet { UserDefaults.standard.set(serverURLString, forKey: serverURLKey) }
    }

    private init() {
        serverURLString = ServerConfig.urlString
    }
}
