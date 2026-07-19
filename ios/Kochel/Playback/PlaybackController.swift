import AVFoundation
import Combine
import MediaPlayer
import Observation

@MainActor
@Observable
final class PlaybackController: NSObject {
    static let shared = PlaybackController()

    private(set) var work: WorkDetail?
    private(set) var recording: Recording?
    private(set) var currentMovementId: Int?
    private(set) var isPlaying = false
    private(set) var elapsedSeconds: Double = 0
    private(set) var durationSeconds: Double = 0

    private let player = AVPlayer()
    private var currentTrackId: Int?
    private var movementStart: Double = 0
    private var movementDuration: Double = 0
    private var cancellables = Set<AnyCancellable>()

    private override init() {
        super.init()
        configureAudioSession()
        configureRemoteCommands()
        observePlaybackState()
        observeInterruptions()
    }

    // MARK: - Audio session

    private func configureAudioSession() {
        do {
            try AVAudioSession.sharedInstance().setCategory(.playback, mode: .default)
            try AVAudioSession.sharedInstance().setActive(true)
        } catch {
            print("Failed to configure audio session: \(error)")
        }
    }

    /// Phone calls, Siri, other apps' audio — pause and let the user resume
    /// manually (or auto-resume when the system says it's safe to).
    private func observeInterruptions() {
        NotificationCenter.default.publisher(for: AVAudioSession.interruptionNotification)
            .sink { [weak self] notification in
                guard
                    let info = notification.userInfo,
                    let typeValue = info[AVAudioSessionInterruptionTypeKey] as? UInt,
                    let type = AVAudioSession.InterruptionType(rawValue: typeValue)
                else { return }

                switch type {
                case .began:
                    self?.player.pause()
                case .ended:
                    let optionsValue = info[AVAudioSessionInterruptionOptionKey] as? UInt ?? 0
                    if AVAudioSession.InterruptionOptions(rawValue: optionsValue).contains(.shouldResume) {
                        self?.player.play()
                    }
                @unknown default:
                    break
                }
            }
            .store(in: &cancellables)

        // headphones unplugged, AirPlay disconnected, etc. — pause rather
        // than blaring out of the speaker unexpectedly
        NotificationCenter.default.publisher(for: AVAudioSession.routeChangeNotification)
            .sink { [weak self] notification in
                guard
                    let info = notification.userInfo,
                    let reasonValue = info[AVAudioSessionRouteChangeReasonKey] as? UInt,
                    reasonValue == AVAudioSession.RouteChangeReason.oldDeviceUnavailable.rawValue
                else { return }
                self?.player.pause()
            }
            .store(in: &cancellables)
    }

    private func observePlaybackState() {
        player.publisher(for: \.timeControlStatus)
            .receive(on: DispatchQueue.main)
            .sink { [weak self] status in
                self?.isPlaying = status == .playing
                self?.updateNowPlayingElapsed()
            }
            .store(in: &cancellables)

        let interval = CMTime(seconds: 0.25, preferredTimescale: 600)
        player.addPeriodicTimeObserver(forInterval: interval, queue: .main) { [weak self] time in
            // guaranteed to run on the main queue (queue: .main above), so this
            // is a real main-actor context even though the closure type itself
            // isn't statically @MainActor
            MainActor.assumeIsolated {
                self?.handleTimeUpdate(time)
            }
        }
    }

    private func handleTimeUpdate(_ time: CMTime) {
        guard movementDuration > 0 else { return }
        let elapsed = time.seconds - movementStart
        elapsedSeconds = max(0, elapsed)
        if elapsed >= movementDuration - 0.15 {
            nextMovement()
        }
    }

    // MARK: - Transport

    func playRecording(work: WorkDetail, recording: Recording, movementId: Int? = nil) {
        let movements = work.sortedMovements
        guard let target = movementId ?? movements.first?.id else { return }
        loadAndPlay(work: work, recording: recording, movementId: target)
    }

    func jumpToMovement(_ movementId: Int) {
        guard let work, let recording else { return }
        loadAndPlay(work: work, recording: recording, movementId: movementId)
    }

    func togglePlayPause() {
        if player.timeControlStatus == .playing {
            player.pause()
        } else {
            player.play()
        }
    }

    func seek(to seconds: Double) {
        let clamped = min(max(seconds, 0), movementDuration)
        let time = CMTime(seconds: movementStart + clamped, preferredTimescale: 600)
        player.seek(to: time, toleranceBefore: .zero, toleranceAfter: .zero)
        elapsedSeconds = clamped
        updateNowPlayingElapsed()
    }

    func nextMovement() {
        guard let work, let recording, let currentMovementId else { return }
        let movements = work.sortedMovements
        guard
            let idx = movements.firstIndex(where: { $0.id == currentMovementId }),
            idx < movements.count - 1
        else { return }
        loadAndPlay(work: work, recording: recording, movementId: movements[idx + 1].id)
    }

    func prevMovement() {
        guard let work, let recording, let currentMovementId else { return }
        let movements = work.sortedMovements
        guard
            let idx = movements.firstIndex(where: { $0.id == currentMovementId }),
            idx > 0
        else { return }
        loadAndPlay(work: work, recording: recording, movementId: movements[idx - 1].id)
    }

    private func loadAndPlay(work: WorkDetail, recording: Recording, movementId: Int) {
        guard let timing = findMovementTiming(recording: recording, movementId: movementId) else { return }

        self.work = work
        self.recording = recording
        self.currentMovementId = movementId
        self.durationSeconds = timing.duration
        self.movementStart = timing.start
        self.movementDuration = timing.duration
        self.elapsedSeconds = 0

        let seekAndPlay = { [weak self] in
            guard let self else { return }
            let time = CMTime(seconds: timing.start, preferredTimescale: 600)
            self.player.seek(to: time, toleranceBefore: .zero, toleranceAfter: .zero) { _ in
                self.player.play()
            }
        }

        if currentTrackId != timing.track.id {
            currentTrackId = timing.track.id
            // offline-first: play the downloaded copy if we have one
            let url = DownloadManager.shared.localFileURL(trackId: timing.track.id)
                ?? APIClient.shared.streamURL(trackId: timing.track.id)
            player.replaceCurrentItem(with: AVPlayerItem(url: url))
            seekAndPlay()
        } else {
            seekAndPlay()
        }

        updateNowPlayingInfo()
    }

    // MARK: - Lock screen / Control Center

    private func configureRemoteCommands() {
        let center = MPRemoteCommandCenter.shared()
        center.playCommand.addTarget { [weak self] _ in
            self?.player.play()
            return .success
        }
        center.pauseCommand.addTarget { [weak self] _ in
            self?.player.pause()
            return .success
        }
        center.togglePlayPauseCommand.addTarget { [weak self] _ in
            self?.togglePlayPause()
            return .success
        }
        center.nextTrackCommand.addTarget { [weak self] _ in
            self?.nextMovement()
            return .success
        }
        center.previousTrackCommand.addTarget { [weak self] _ in
            self?.prevMovement()
            return .success
        }
        center.changePlaybackPositionCommand.addTarget { [weak self] event in
            guard let self, let event = event as? MPChangePlaybackPositionCommandEvent else {
                return .commandFailed
            }
            self.seek(to: event.positionTime - self.movementStart)
            return .success
        }
    }

    private func updateNowPlayingInfo() {
        guard
            let work, let recording, let currentMovementId,
            let movement = work.movements.first(where: { $0.id == currentMovementId })
        else { return }

        var info: [String: Any] = [:]
        info[MPMediaItemPropertyTitle] = movement.name ?? "\(toRoman(movement.movementNumber)). \(work.title)"
        info[MPMediaItemPropertyArtist] = work.composerName
        info[MPMediaItemPropertyAlbumTitle] = [work.title, recording.credit].filter { !$0.isEmpty }.joined(separator: " — ")
        info[MPMediaItemPropertyPlaybackDuration] = movementDuration
        info[MPNowPlayingInfoPropertyElapsedPlaybackTime] = elapsedSeconds
        info[MPNowPlayingInfoPropertyPlaybackRate] = isPlaying ? 1.0 : 0.0
        MPNowPlayingInfoCenter.default().nowPlayingInfo = info
    }

    private func updateNowPlayingElapsed() {
        guard var info = MPNowPlayingInfoCenter.default().nowPlayingInfo else { return }
        info[MPNowPlayingInfoPropertyElapsedPlaybackTime] = elapsedSeconds
        info[MPNowPlayingInfoPropertyPlaybackRate] = isPlaying ? 1.0 : 0.0
        MPNowPlayingInfoCenter.default().nowPlayingInfo = info
    }
}
