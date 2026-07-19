import SwiftUI

struct RootView: View {
    @State private var showNowPlaying = false

    var body: some View {
        ZStack(alignment: .bottom) {
            NavigationStack {
                LibraryHomeView()
            }
            MiniPlayerBar { showNowPlaying = true }
        }
        .fullScreenCover(isPresented: $showNowPlaying) {
            NowPlayingView()
        }
    }
}
