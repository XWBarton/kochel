import SwiftUI

@main
struct KochelApp: App {
    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(PlaybackController.shared)
                .environment(DownloadManager.shared)
                .environment(AppSettings.shared)
        }
    }
}
