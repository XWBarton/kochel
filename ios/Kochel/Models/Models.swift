import Foundation

struct Composer: Codable, Identifiable, Hashable {
    let id: Int
    let name: String
    let sortName: String
    let birthYear: Int?
    let deathYear: Int?
    let period: String?
    let workCount: Int

    enum CodingKeys: String, CodingKey {
        case id, name, period
        case sortName = "sort_name"
        case birthYear = "birth_year"
        case deathYear = "death_year"
        case workCount = "work_count"
    }
}

struct ComposerListResponse: Codable {
    let items: [Composer]
    let total: Int
}

struct CatalogueNumber: Codable, Hashable {
    let system: String
    let number: String
    let isPrimary: Bool

    enum CodingKeys: String, CodingKey {
        case system, number
        case isPrimary = "is_primary"
    }
}

struct WorkListItem: Codable, Identifiable, Hashable {
    let id: Int
    let title: String
    let subtitle: String?
    let key: String?
    let form: String?
    let category: String?
    let composedYear: Int?
    let composedYearUncertain: Bool
    let composedYearRangeEnd: Int?
    let catalogueNumbers: [CatalogueNumber]
    let movementCount: Int
    let recordingCount: Int

    enum CodingKeys: String, CodingKey {
        case id, title, subtitle, key, form, category
        case composedYear = "composed_year"
        case composedYearUncertain = "composed_year_uncertain"
        case composedYearRangeEnd = "composed_year_range_end"
        case catalogueNumbers = "catalogue_numbers"
        case movementCount = "movement_count"
        case recordingCount = "recording_count"
    }
}

struct WorkListResponse: Codable {
    let items: [WorkListItem]
    let total: Int
}

struct Movement: Codable, Identifiable, Hashable {
    let id: Int
    let movementNumber: Int
    let name: String?

    enum CodingKeys: String, CodingKey {
        case id, name
        case movementNumber = "movement_number"
    }
}

struct WorkDetail: Codable, Identifiable, Hashable {
    let id: Int
    let title: String
    let subtitle: String?
    let key: String?
    let form: String?
    let category: String?
    let composedYear: Int?
    let composedYearUncertain: Bool
    let composedYearRangeEnd: Int?
    let catalogueNumbers: [CatalogueNumber]
    let movementCount: Int
    let recordingCount: Int
    let composerId: Int
    let composerName: String
    let movements: [Movement]

    enum CodingKeys: String, CodingKey {
        case id, title, subtitle, key, form, category, movements
        case composedYear = "composed_year"
        case composedYearUncertain = "composed_year_uncertain"
        case composedYearRangeEnd = "composed_year_range_end"
        case catalogueNumbers = "catalogue_numbers"
        case movementCount = "movement_count"
        case recordingCount = "recording_count"
        case composerId = "composer_id"
        case composerName = "composer_name"
    }

    var sortedMovements: [Movement] {
        movements.sorted { $0.movementNumber < $1.movementNumber }
    }
}

struct WorkBrowseItem: Codable, Identifiable, Hashable {
    let id: Int
    let title: String
    let category: String?
    let composerId: Int
    let composerName: String
    let recordingCount: Int

    enum CodingKeys: String, CodingKey {
        case id, title, category
        case composerId = "composer_id"
        case composerName = "composer_name"
        case recordingCount = "recording_count"
    }
}

struct WorkBrowseResponse: Codable {
    let items: [WorkBrowseItem]
    let total: Int
}

struct ConductorSummary: Codable, Identifiable, Hashable {
    let id: Int
    let name: String
    let recordingCount: Int
    let workCount: Int

    enum CodingKeys: String, CodingKey {
        case id, name
        case recordingCount = "recording_count"
        case workCount = "work_count"
    }
}

struct ConductorListResponse: Codable {
    let items: [ConductorSummary]
    let total: Int
}

struct PersonRef: Codable, Identifiable, Hashable {
    let id: Int
    let name: String
}

struct EnsembleRef: Codable, Identifiable, Hashable {
    let id: Int
    let name: String
}

enum PerformerRole: String, Codable, Hashable {
    case conductor
    case soloist
    case performer
}

struct RecordingPerformerRef: Codable, Hashable {
    let person: PersonRef
    let role: PerformerRole
    let instrument: String?
}

struct TrackMovementRef: Codable, Hashable {
    let movementId: Int
    let sequence: Int
    let startSeconds: Double?
    let durationSecondsOverride: Double?

    enum CodingKeys: String, CodingKey {
        case sequence
        case movementId = "movement_id"
        case startSeconds = "start_seconds"
        case durationSecondsOverride = "duration_seconds_override"
    }
}

struct Track: Codable, Identifiable, Hashable {
    let id: Int
    let trackNumber: Int?
    let discNumber: Int?
    let format: String
    let durationSeconds: Double
    let movementIds: [Int]
    let trackMovements: [TrackMovementRef]

    enum CodingKeys: String, CodingKey {
        case id, format
        case trackNumber = "track_number"
        case discNumber = "disc_number"
        case durationSeconds = "duration_seconds"
        case movementIds = "movement_ids"
        case trackMovements = "track_movements"
    }
}

struct Recording: Codable, Identifiable, Hashable {
    let id: Int
    let movementId: Int?
    let ensemble: EnsembleRef?
    let performers: [RecordingPerformerRef]
    let label: String?
    let recordingYear: Int?
    let releaseYear: Int?
    let isDefaultInLibrary: Bool
    let totalDurationSeconds: Double
    let tracks: [Track]

    enum CodingKeys: String, CodingKey {
        case id, ensemble, performers, label, tracks
        case movementId = "movement_id"
        case recordingYear = "recording_year"
        case releaseYear = "release_year"
        case isDefaultInLibrary = "is_default_in_library"
        case totalDurationSeconds = "total_duration_seconds"
    }

    var conductor: PersonRef? {
        performers.first { $0.role == .conductor }?.person
    }

    var credit: String {
        [ensemble?.name, conductor?.name].compactMap { $0 }.joined(separator: " · ")
    }
}

struct RecordingListResponse: Codable {
    let items: [Recording]
    let total: Int
}

struct SearchComposerResult: Codable, Identifiable, Hashable {
    let id: Int
    let name: String
    let birthYear: Int?
    let deathYear: Int?
    let workCount: Int

    enum CodingKeys: String, CodingKey {
        case id, name
        case birthYear = "birth_year"
        case deathYear = "death_year"
        case workCount = "work_count"
    }
}

struct SearchWorkResult: Codable, Identifiable, Hashable {
    let id: Int
    let title: String
    let composerId: Int
    let composerName: String

    enum CodingKeys: String, CodingKey {
        case id, title
        case composerId = "composer_id"
        case composerName = "composer_name"
    }
}

struct SearchRecordingResult: Codable, Identifiable, Hashable {
    let id: Int
    let workId: Int
    let workTitle: String
    let composerName: String
    let ensembleName: String?
    let conductorName: String?
    let label: String?
    let recordingYear: Int?

    enum CodingKeys: String, CodingKey {
        case id, label
        case workId = "work_id"
        case workTitle = "work_title"
        case composerName = "composer_name"
        case ensembleName = "ensemble_name"
        case conductorName = "conductor_name"
        case recordingYear = "recording_year"
    }
}

struct SearchResponse: Codable {
    let query: String
    let composers: [SearchComposerResult]
    let works: [SearchWorkResult]
    let recordings: [SearchRecordingResult]
}
