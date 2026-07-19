import SwiftUI

struct NowPlayingView: View {
    @Environment(PlaybackController.self) private var playback
    @Environment(\.dismiss) private var dismiss
    @State private var dark = true
    @State private var isDragging = false
    @State private var dragProgress: Double = 0

    private var panelBg: Color { dark ? Theme.ink : Theme.paper }
    private var panelFg: Color { dark ? Theme.paper : Theme.ink }

    var body: some View {
        ZStack(alignment: .top) {
            panelBg.ignoresSafeArea()

            VStack(spacing: 0) {
                topBar

                if let work = playback.work, let recording = playback.recording,
                   let movementId = playback.currentMovementId,
                   let movement = work.movements.first(where: { $0.id == movementId }) {
                    Text("PLAYING FROM \(work.title.uppercased())")
                        .trackedLabel(size: 11, opacity: 0.55)
                        .foregroundStyle(panelFg)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 40)
                        .padding(.bottom, 18)

                    Sunburst(
                        foreground: panelFg,
                        accent: Theme.accent,
                        isPlaying: playback.isPlaying,
                        progress: playback.durationSeconds > 0 ? playback.elapsedSeconds / playback.durationSeconds : 0
                    )
                        .frame(width: 228, height: 228)
                        .padding(.bottom, 20)

                    VStack(spacing: 8) {
                        Text(work.composerName)
                            .font(KochelFont.display(32))
                            .foregroundStyle(panelFg)
                            .multilineTextAlignment(.center)
                        Text(work.title)
                            .font(KochelFont.body(18))
                            .foregroundStyle(panelFg)
                            .multilineTextAlignment(.center)
                        Text("\(toRoman(movement.movementNumber)). \(movement.name ?? "Untitled")")
                            .font(KochelFont.bodyItalic(14))
                            .foregroundStyle(panelFg.opacity(0.7))
                    }
                    .padding(.horizontal, 24)

                    transport
                        .padding(.top, 22)

                    Rectangle().fill(panelFg.opacity(0.25)).frame(height: 1).padding(.top, 3)
                    Rectangle().fill(panelFg.opacity(0.25)).frame(height: 1).padding(.bottom, 10)

                    Text("MOVEMENTS")
                        .trackedLabel(size: 11, opacity: 0.55)
                        .foregroundStyle(panelFg)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(.horizontal, 28)
                        .padding(.bottom, 6)

                    ScrollView {
                        ForEach(work.sortedMovements) { m in
                            MovementRow(
                                movement: m,
                                isActive: m.id == movementId,
                                foreground: panelFg,
                                duration: findMovementTiming(recording: recording, movementId: m.id)?.duration
                            )
                            .contentShape(Rectangle())
                            .onTapGesture { playback.jumpToMovement(m.id) }
                            .padding(.horizontal, 28)
                            .accessibilityIdentifier("now-playing-movement-\(m.id)")
                        }
                    }

                    Text([recording.credit, recording.recordingYear.map(String.init), recording.label]
                        .compactMap { $0 }.filter { !$0.isEmpty }.joined(separator: " · "))
                        .trackedLabel(size: 10, opacity: 0.45)
                        .foregroundStyle(panelFg)
                        .multilineTextAlignment(.center)
                        .padding(.top, 8)
                        .padding(.bottom, 16)
                } else {
                    Spacer()
                    Text("Nothing playing")
                        .font(KochelFont.bodyItalic(16))
                        .foregroundStyle(panelFg.opacity(0.6))
                    Spacer()
                }
            }
        }
    }

    private var topBar: some View {
        HStack {
            Button { dismiss() } label: {
                Image(systemName: "chevron.down")
                    .foregroundStyle(panelFg.opacity(0.6))
            }
            .accessibilityIdentifier("now-playing-dismiss")
            Spacer()
            Button { dark.toggle() } label: {
                Text(dark ? "LIGHT" : "DARK")
                    .trackedLabel(size: 10, opacity: 0.5)
                    .foregroundStyle(panelFg)
            }
        }
        .padding(.horizontal, 24)
        .padding(.top, 20)
        .padding(.bottom, 8)
    }

    @ViewBuilder
    private var transport: some View {
        VStack(spacing: 10) {
            GeometryReader { geo in
                let progress = isDragging ? dragProgress : (playback.durationSeconds > 0 ? playback.elapsedSeconds / playback.durationSeconds : 0)
                ZStack(alignment: .leading) {
                    Rectangle().fill(panelFg.opacity(0.25)).frame(height: 1)
                    Rectangle().fill(Theme.accent).frame(width: geo.size.width * progress, height: 1)
                    Circle().fill(Theme.accent).frame(width: 10, height: 10)
                        .offset(x: geo.size.width * progress - 5, y: -4.5)
                }
                .contentShape(Rectangle().inset(by: -12))
                .gesture(
                    DragGesture(minimumDistance: 0)
                        .onChanged { value in
                            isDragging = true
                            dragProgress = min(max(value.location.x / geo.size.width, 0), 1)
                        }
                        .onEnded { _ in
                            playback.seek(to: dragProgress * playback.durationSeconds)
                            isDragging = false
                        }
                )
            }
            .frame(height: 10)
            .padding(.horizontal, 28)

            HStack {
                Text(formatDuration(isDragging ? dragProgress * playback.durationSeconds : playback.elapsedSeconds))
                Spacer()
                Text("-" + formatDuration(playback.durationSeconds - (isDragging ? dragProgress * playback.durationSeconds : playback.elapsedSeconds)))
            }
            .font(.system(size: 12).monospacedDigit())
            .foregroundStyle(panelFg.opacity(0.6))
            .padding(.horizontal, 28)

            HStack(spacing: 40) {
                Button { playback.prevMovement() } label: {
                    Triangle().fill(panelFg.opacity(0.85)).frame(width: 14, height: 16).rotationEffect(.degrees(180))
                }
                Button { playback.togglePlayPause() } label: {
                    ZStack {
                        Circle().fill(Theme.accent).frame(width: 64, height: 64)
                        if playback.isPlaying {
                            HStack(spacing: 6) {
                                Rectangle().fill(Theme.paper).frame(width: 6, height: 20)
                                Rectangle().fill(Theme.paper).frame(width: 6, height: 20)
                            }
                        } else {
                            Triangle().fill(Theme.paper).frame(width: 16, height: 20).offset(x: 2)
                        }
                    }
                }
                Button { playback.nextMovement() } label: {
                    Triangle().fill(panelFg.opacity(0.85)).frame(width: 14, height: 16)
                }
            }
        }
    }
}

private struct MovementRow: View {
    let movement: Movement
    let isActive: Bool
    let foreground: Color
    let duration: Double?

    var body: some View {
        HStack(alignment: .center, spacing: 14) {
            Text(toRoman(movement.movementNumber))
                .font(KochelFont.display(16))
                .foregroundStyle(isActive ? Theme.accent : foreground)
                .frame(width: 26, alignment: .leading)
            Text(movement.name ?? "Untitled")
                .font(KochelFont.body(15))
                .foregroundStyle(isActive ? Theme.accent : foreground.opacity(0.85))
            Spacer()
            if let duration {
                Text(formatDuration(duration))
                    .font(.system(size: 12).monospacedDigit())
                    .foregroundStyle(foreground.opacity(0.5))
            }
        }
        .padding(.vertical, 13)
        .frame(minHeight: 44)
        .overlay(alignment: .bottom) { Rectangle().fill(foreground.opacity(0.15)).frame(height: 1) }
    }
}
