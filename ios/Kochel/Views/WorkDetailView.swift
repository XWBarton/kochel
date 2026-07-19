import SwiftUI

struct WorkDetailView: View {
    let workId: Int
    @State private var work: LoadState<WorkDetail> = .loading
    @State private var recordings: LoadState<[Recording]> = .loading
    @Environment(PlaybackController.self) private var playback

    var body: some View {
        ScrollView {
            switch (work, recordings) {
            case (.loading, _), (_, .loading):
                ProgressView().padding(.top, 60)
            case (.failed(let message), _):
                Text(message).foregroundStyle(.secondary).padding(.top, 60)
            case (_, .failed(let message)):
                Text(message).foregroundStyle(.secondary).padding(.top, 60)
            case (.loaded(let work), .loaded(let recordings)):
                content(work: work, recordings: recordings)
            }
        }
        .background(Theme.paper)
        .task {
            async let workResult = APIClient.shared.work(workId)
            async let recordingsResult = APIClient.shared.recordings(forWork: workId)
            do {
                let (w, r) = try await (workResult, recordingsResult)
                work = .loaded(w)
                recordings = .loaded(r)
            } catch {
                work = .failed(error.localizedDescription)
            }
        }
    }

    @ViewBuilder
    private func content(work: WorkDetail, recordings: [Recording]) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            NavigationLink(value: Composer(id: work.composerId, name: work.composerName, sortName: work.composerName, birthYear: nil, deathYear: nil, period: nil, workCount: 0)) {
                Text(work.composerName)
                    .trackedLabel(size: 12)
            }

            Text(work.title)
                .font(KochelFont.body(25, weight: .medium))
                .foregroundStyle(Theme.ink)
                .padding(.top, 4)

            Text(metaLine(work))
                .trackedLabel(size: 11)
                .padding(.top, 8)
                .padding(.bottom, 14)
                .overlay(alignment: .bottom) { Rectangle().fill(Theme.ink).frame(height: 1) }

            HStack {
                Text("\(recordings.count) \(recordings.count == 1 ? "Recording" : "Recordings")")
                    .trackedLabel(size: 11, wide: true)
                Spacer()
                if recordings.count > 1 {
                    NavigationLink(value: CompareRoute(workId: work.id)) {
                        Text("Compare →")
                            .font(KochelFont.body(12))
                            .foregroundStyle(Theme.accent)
                    }
                }
            }
            .padding(.top, 16)
            .padding(.bottom, 4)

            ForEach(recordings) { recording in
                RecordingRow(work: work, recording: recording) {
                    playback.playRecording(work: work, recording: recording)
                }
            }

            Text("MOVEMENTS")
                .trackedLabel(size: 11, wide: true)
                .padding(.top, 14)
                .padding(.bottom, 4)

            ForEach(work.sortedMovements) { movement in
                MovementPreviewRow(
                    movement: movement,
                    duration: recordings.first.flatMap { findMovementTiming(recording: $0, movementId: movement.id)?.duration }
                )
            }
        }
        .padding(.horizontal, 24)
        .padding(.top, 24)
        .padding(.bottom, 100)
        .navigationDestination(for: Composer.self) { ComposerWorksView(composer: $0) }
        .navigationDestination(for: CompareRoute.self) { CompareRecordingsView(workId: $0.workId) }
    }

    private func metaLine(_ work: WorkDetail) -> String {
        var parts = [String]()
        if let category = work.category { parts.append(category) }
        parts.append("\(work.movementCount) \(work.movementCount == 1 ? "movement" : "movements")")
        if let year = work.composedYear {
            parts.append("Composed \(year)\(work.composedYearUncertain ? "?" : "")")
        }
        return parts.joined(separator: " · ")
    }
}

struct CompareRoute: Hashable {
    let workId: Int
}

private struct RecordingRow: View {
    let work: WorkDetail
    let recording: Recording
    let onPlay: () -> Void
    @Environment(DownloadManager.self) private var downloads

    private var allDownloaded: Bool {
        recording.tracks.allSatisfy { downloads.isDownloaded(trackId: $0.id) }
    }

    private var anyDownloading: Bool {
        recording.tracks.contains { downloads.activeDownloads.contains($0.id) }
    }

    var body: some View {
        HStack(spacing: 12) {
            Button(action: onPlay) { PlayTriangle() }
                .accessibilityIdentifier("play-recording-\(recording.id)")
            VStack(alignment: .leading, spacing: 2) {
                Text(recording.credit.isEmpty ? "Unattributed performance" : recording.credit)
                    .font(KochelFont.body(15))
                    .foregroundStyle(Theme.ink)
                Text([recording.label, recording.recordingYear.map(String.init)].compactMap { $0 }.joined(separator: " · "))
                    .trackedLabel(size: 11)
            }
            Spacer()
            if allDownloaded {
                Image(systemName: "checkmark.circle.fill")
                    .foregroundStyle(Theme.accent.opacity(0.7))
                    .font(.system(size: 14))
            } else if anyDownloading {
                ProgressView().scaleEffect(0.7)
            } else {
                Button {
                    downloads.downloadRecording(recording, work: work)
                } label: {
                    Image(systemName: "arrow.down.circle")
                        .foregroundStyle(Theme.ink.opacity(0.5))
                        .font(.system(size: 16))
                }
                .accessibilityIdentifier("download-recording-\(recording.id)")
            }
        }
        .padding(.vertical, 12)
        .frame(minHeight: 44)
        .overlay(alignment: .bottom) { Rectangle().fill(Theme.divider).frame(height: 1) }
    }
}

private struct MovementPreviewRow: View {
    let movement: Movement
    let duration: Double?

    var body: some View {
        HStack(alignment: .firstTextBaseline, spacing: 12) {
            Text(toRoman(movement.movementNumber))
                .font(KochelFont.display(15))
                .foregroundStyle(Theme.ink)
                .frame(width: 22, alignment: .leading)
            Text(movement.name ?? "Untitled")
                .font(KochelFont.body(14))
                .foregroundStyle(Theme.ink)
            Spacer()
            if let duration {
                Text(formatDuration(duration))
                    .font(.system(size: 12).monospacedDigit())
                    .foregroundStyle(Theme.ink.opacity(0.5))
            }
        }
        .padding(.vertical, 9)
        .overlay(alignment: .bottom) { Rectangle().fill(Theme.ink.opacity(0.1)).frame(height: 1) }
    }
}
