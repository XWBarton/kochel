import Foundation

enum APIError: Error, LocalizedError {
    case invalidURL
    case invalidResponse
    case http(Int)

    var errorDescription: String? {
        switch self {
        case .invalidURL: return "Invalid server URL"
        case .invalidResponse: return "Invalid response from server"
        case .http(let code): return "Server returned \(code)"
        }
    }
}

struct APIClient {
    static let shared = APIClient()

    private func get<T: Decodable>(_ path: String, query: [String: String] = [:]) async throws -> T {
        guard
            var components = URLComponents(
                url: ServerConfig.apiRoot.appendingPathComponent(path),
                resolvingAgainstBaseURL: false
            )
        else { throw APIError.invalidURL }

        if !query.isEmpty {
            components.queryItems = query.map { URLQueryItem(name: $0.key, value: $0.value) }
        }
        guard let url = components.url else { throw APIError.invalidURL }

        let (data, response) = try await URLSession.shared.data(from: url)
        guard let http = response as? HTTPURLResponse else { throw APIError.invalidResponse }
        guard (200..<300).contains(http.statusCode) else { throw APIError.http(http.statusCode) }
        return try JSONDecoder().decode(T.self, from: data)
    }

    func composers() async throws -> [Composer] {
        try await (get("composers") as ComposerListResponse).items
    }

    func composer(_ id: Int) async throws -> Composer {
        try await get("composers/\(id)")
    }

    func works(forComposer id: Int) async throws -> [WorkListItem] {
        try await (get("composers/\(id)/works") as WorkListResponse).items
    }

    func allWorks() async throws -> [WorkBrowseItem] {
        try await (get("works") as WorkBrowseResponse).items
    }

    func conductors() async throws -> [ConductorSummary] {
        try await (get("conductors") as ConductorListResponse).items
    }

    func work(_ id: Int) async throws -> WorkDetail {
        try await get("works/\(id)")
    }

    func recordings(forWork id: Int) async throws -> [Recording] {
        try await (get("works/\(id)/recordings") as RecordingListResponse).items
    }

    func search(_ query: String) async throws -> SearchResponse {
        try await get("search", query: ["q": query])
    }

    func streamURL(trackId: Int) -> URL {
        ServerConfig.apiRoot.appendingPathComponent("tracks/\(trackId)/stream")
    }
}
