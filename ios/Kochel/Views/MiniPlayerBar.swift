import SwiftUI

struct MiniPlayerBar: View {
    @Environment(PlaybackController.self) private var playback
    let onTap: () -> Void

    var body: some View {
        if let work = playback.work, let movementId = playback.currentMovementId {
            let movement = work.movements.first { $0.id == movementId }
            let label = movement.map { "\(work.composerName) — \(toRoman($0.movementNumber)). \($0.name ?? "Untitled")" }
                ?? work.composerName
            let progress = playback.durationSeconds > 0 ? playback.elapsedSeconds / playback.durationSeconds : 0

            VStack(spacing: 0) {
                GeometryReader { geo in
                    Rectangle().fill(Theme.accent).frame(width: geo.size.width * progress, height: 1)
                }
                .frame(height: 1)

                HStack(spacing: 12) {
                    Sunburst(foreground: Theme.ink, accent: Theme.accent, showRays: false, isPlaying: playback.isPlaying)
                        .frame(width: 26, height: 26)

                    Text(label)
                        .font(.system(size: 13))
                        .foregroundStyle(Theme.ink)
                        .lineLimit(1)
                        .truncationMode(.tail)

                    Spacer(minLength: 8)

                    Button { playback.prevMovement() } label: {
                        Triangle().fill(Theme.ink.opacity(0.7)).frame(width: 8, height: 10).rotationEffect(.degrees(180))
                    }
                    Button { playback.togglePlayPause() } label: {
                        if playback.isPlaying {
                            HStack(spacing: 3) {
                                Rectangle().fill(Theme.ink).frame(width: 3, height: 12)
                                Rectangle().fill(Theme.ink).frame(width: 3, height: 12)
                            }
                        } else {
                            Triangle().fill(Theme.ink).frame(width: 9, height: 11)
                        }
                    }
                    Button { playback.nextMovement() } label: {
                        Triangle().fill(Theme.ink.opacity(0.7)).frame(width: 8, height: 10)
                    }
                }
                .padding(.horizontal, 20)
                .frame(height: 56)
                .contentShape(Rectangle())
                .onTapGesture { onTap() }
            }
            .background(Theme.paper)
            .overlay(alignment: .top) { Rectangle().fill(Theme.ink).frame(height: 1) }
            .accessibilityIdentifier("mini-player-bar")
        }
    }
}
