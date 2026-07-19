import Combine
import Foundation
import Observation

struct DownloadedTrack: Codable, Identifiable {
    let trackId: Int
    let workId: Int
    let workTitle: String
    let composerName: String
    let format: String
    let fileSizeBytes: Int64

    var id: Int { trackId }

    /// Lossless vs. compressed, derived from container format — the
    /// distinction the Downloads screen's quality tag communicates.
    var isLossless: Bool {
        ["flac", "wav", "alac"].contains(format.lowercased())
    }
}

@MainActor
@Observable
final class DownloadManager {
    static let shared = DownloadManager()

    private(set) var downloaded: [DownloadedTrack] = []
    private(set) var progress: [Int: Double] = [:]
    private(set) var activeDownloads: Set<Int> = []

    private var tasks: [Int: URLSessionDownloadTask] = [:]
    private var cancellables: [Int: AnyCancellable] = [:]

    private var downloadsDirectory: URL {
        let dir = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
            .appendingPathComponent("Downloads", isDirectory: true)
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        return dir
    }

    private var metadataURL: URL {
        downloadsDirectory.appendingPathComponent("_metadata.json")
    }

    private init() {
        loadMetadata()
    }

    func localFileURL(trackId: Int) -> URL? {
        guard downloaded.contains(where: { $0.trackId == trackId }) else { return nil }
        let url = downloadsDirectory.appendingPathComponent("\(trackId).audio")
        return FileManager.default.fileExists(atPath: url.path) ? url : nil
    }

    func isDownloaded(trackId: Int) -> Bool {
        downloaded.contains { $0.trackId == trackId }
    }

    func download(track: Track, work: WorkDetail) {
        guard !isDownloaded(trackId: track.id), !activeDownloads.contains(track.id) else { return }

        let remoteURL = APIClient.shared.streamURL(trackId: track.id)
        activeDownloads.insert(track.id)
        progress[track.id] = 0

        let task = URLSession.shared.downloadTask(with: remoteURL) { [weak self] tempURL, _, error in
            Task { @MainActor in
                self?.handleCompletion(trackId: track.id, track: track, work: work, tempURL: tempURL, error: error)
            }
        }

        cancellables[track.id] = task.progress.publisher(for: \.fractionCompleted)
            .receive(on: DispatchQueue.main)
            .sink { [weak self] fraction in
                self?.progress[track.id] = fraction
            }

        tasks[track.id] = task
        task.resume()
    }

    func downloadRecording(_ recording: Recording, work: WorkDetail) {
        for track in recording.tracks {
            download(track: track, work: work)
        }
    }

    func cancelDownload(trackId: Int) {
        tasks[trackId]?.cancel()
        tasks[trackId] = nil
        cancellables[trackId] = nil
        activeDownloads.remove(trackId)
        progress[trackId] = nil
    }

    func delete(trackId: Int) {
        let url = downloadsDirectory.appendingPathComponent("\(trackId).audio")
        try? FileManager.default.removeItem(at: url)
        downloaded.removeAll { $0.trackId == trackId }
        saveMetadata()
    }

    private func handleCompletion(trackId: Int, track: Track, work: WorkDetail, tempURL: URL?, error: Error?) {
        activeDownloads.remove(trackId)
        progress[trackId] = nil
        cancellables[trackId] = nil
        tasks[trackId] = nil

        guard let tempURL, error == nil else {
            print("Download failed for track \(trackId): \(error?.localizedDescription ?? "unknown error")")
            return
        }

        let destination = downloadsDirectory.appendingPathComponent("\(trackId).audio")
        do {
            if FileManager.default.fileExists(atPath: destination.path) {
                try FileManager.default.removeItem(at: destination)
            }
            try FileManager.default.moveItem(at: tempURL, to: destination)
            let attributes = try? FileManager.default.attributesOfItem(atPath: destination.path)
            let size = (attributes?[.size] as? Int64) ?? 0

            let entry = DownloadedTrack(
                trackId: trackId,
                workId: work.id,
                workTitle: work.title,
                composerName: work.composerName,
                format: track.format,
                fileSizeBytes: size
            )
            downloaded.removeAll { $0.trackId == trackId }
            downloaded.append(entry)
            saveMetadata()
        } catch {
            print("Failed to save downloaded file for track \(trackId): \(error)")
        }
    }

    private func loadMetadata() {
        guard let data = try? Data(contentsOf: metadataURL) else { return }
        downloaded = (try? JSONDecoder().decode([DownloadedTrack].self, from: data)) ?? []
    }

    private func saveMetadata() {
        guard let data = try? JSONEncoder().encode(downloaded) else { return }
        try? data.write(to: metadataURL)
    }

    var totalDownloadedBytes: Int64 {
        downloaded.reduce(0) { $0 + $1.fileSizeBytes }
    }

    var deviceTotalBytes: Int64 {
        let attrs = try? FileManager.default.attributesOfFileSystem(forPath: NSHomeDirectory())
        return (attrs?[.systemSize] as? Int64) ?? 1
    }
}
