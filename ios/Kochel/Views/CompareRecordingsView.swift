import SwiftUI

/// A vertical adaptation of the web's side-by-side comparison grid — an
/// iPhone-width column can't fit multiple recordings across, so each
/// recording gets its own card with its movement-by-movement durations
/// stacked, in the same left-to-right reading order as the web grid's columns.
struct CompareRecordingsView: View {
    let workId: Int
    @State private var work: LoadState<WorkDetail> = .loading
    @State private var recordings: LoadState<[Recording]> = .loading

    var body: some View {
        ScrollView {
            switch (work, recordings) {
            case (.loaded(let work), .loaded(let recordings)):
                content(work: work, recordings: recordings)
            case (.failed(let message), _), (_, .failed(let message)):
                Text(message).foregroundStyle(.secondary).padding(.top, 60)
            default:
                ProgressView().padding(.top, 60)
            }
        }
        .background(Theme.paper)
        .navigationTitle("Compare")
        .task {
            async let w = APIClient.shared.work(workId)
            async let r = APIClient.shared.recordings(forWork: workId)
            do {
                let (workResult, recordingsResult) = try await (w, r)
                work = .loaded(workResult)
                recordings = .loaded(recordingsResult)
            } catch {
                work = .failed(error.localizedDescription)
            }
        }
    }

    @ViewBuilder
    private func content(work: WorkDetail, recordings: [Recording]) -> some View {
        VStack(alignment: .leading, spacing: 24) {
            Text("Comparing \(recordings.count) recordings of \(work.title)")
                .font(KochelFont.body(18))
                .foregroundStyle(Theme.ink)
                .padding(.top, 16)

            ForEach(recordings) { recording in
                VStack(alignment: .leading, spacing: 0) {
                    HStack {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(recording.ensemble?.name ?? "Unattributed ensemble")
                                .font(KochelFont.body(16))
                            if let conductor = recording.conductor {
                                Text(conductor.name).font(.system(size: 12)).opacity(0.6)
                            }
                        }
                        Spacer()
                        if recording.isDefaultInLibrary {
                            Text("DEFAULT")
                                .trackedLabel(size: 10)
                                .foregroundStyle(Theme.accent)
                        }
                    }
                    .padding(.bottom, 10)
                    .overlay(alignment: .bottom) { Rectangle().fill(Theme.ink).frame(height: 1) }

                    ForEach(work.sortedMovements) { movement in
                        HStack {
                            Text(toRoman(movement.movementNumber))
                                .font(KochelFont.display(13))
                                .frame(width: 20, alignment: .leading)
                            Text(movement.name ?? "—").font(.system(size: 13))
                            Spacer()
                            if let timing = findMovementTiming(recording: recording, movementId: movement.id) {
                                Text(formatDuration(timing.duration))
                                    .font(.system(size: 12).monospacedDigit())
                                    .opacity(0.6)
                            }
                        }
                        .padding(.vertical, 8)
                        .overlay(alignment: .bottom) { Rectangle().fill(Theme.divider).frame(height: 1) }
                    }

                    HStack {
                        Text("TOTAL").trackedLabel(size: 10)
                        Spacer()
                        Text(formatDuration(recording.totalDurationSeconds))
                            .font(.system(size: 13, weight: .semibold).monospacedDigit())
                    }
                    .padding(.top, 8)
                }
            }
        }
        .padding(.horizontal, 24)
        .padding(.bottom, 60)
    }
}
