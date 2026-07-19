import SwiftUI

enum LibraryTab: String, CaseIterable {
    case composers = "Composers"
    case works = "Works"
    case conductors = "Conductors"
}

struct LibraryHomeView: View {
    @State private var tab: LibraryTab = .composers
    @State private var composers: LoadState<[Composer]> = .loading
    @State private var works: LoadState<[WorkBrowseItem]> = .loading
    @State private var conductors: LoadState<[ConductorSummary]> = .loading
    @State private var showSearch = false
    @State private var showDownloads = false
    @State private var showSettings = false

    var body: some View {
        VStack(spacing: 0) {
            header
            tabRow
            content
        }
        .background(Theme.paper)
        .navigationBarHidden(true)
        .task { await loadComposers() }
        .sheet(isPresented: $showSearch) { SearchView() }
        .sheet(isPresented: $showDownloads) { DownloadsView() }
        .sheet(isPresented: $showSettings) { SettingsView() }
    }

    private var header: some View {
        HStack(alignment: .firstTextBaseline) {
            Text("Library")
                .font(KochelFont.display(30))
                .foregroundStyle(Theme.ink)
            Spacer()
            Button { showSearch = true } label: {
                Image(systemName: "magnifyingglass")
            }
            .accessibilityIdentifier("open-search")
            Button { showDownloads = true } label: {
                Image(systemName: "arrow.down.circle")
            }
            .accessibilityIdentifier("open-downloads")
            Button { showSettings = true } label: {
                Image(systemName: "gearshape")
            }
            .accessibilityIdentifier("open-settings")
        }
        .foregroundStyle(Theme.ink.opacity(0.7))
        .padding(.horizontal, 24)
        .padding(.top, 64)
        .padding(.bottom, 14)
    }

    private var tabRow: some View {
        HStack(spacing: 22) {
            ForEach(LibraryTab.allCases, id: \.self) { t in
                Button {
                    tab = t
                    Task { await loadTabIfNeeded(t) }
                } label: {
                    Text(t.rawValue)
                        .trackedLabel(opacity: tab == t ? 1 : 0.55)
                        .foregroundStyle(tab == t ? Theme.accent : Theme.ink)
                        .padding(.bottom, 8)
                        .overlay(alignment: .bottom) {
                            if tab == t {
                                Rectangle().fill(Theme.accent).frame(height: 2)
                            }
                        }
                }
            }
            Spacer()
        }
        .padding(.horizontal, 24)
        .overlay(alignment: .bottom) {
            Rectangle().fill(Theme.ink).frame(height: 1)
        }
    }

    @ViewBuilder
    private var content: some View {
        switch tab {
        case .composers:
            listView(composers) { list in
                List(list) { composer in
                    NavigationLink(value: composer) {
                        ComposerRow(composer: composer)
                    }
                    .accessibilityIdentifier("composer-row-\(composer.id)")
                    .listRowSeparator(.hidden)
                    .listRowInsets(EdgeInsets(top: 0, leading: 24, bottom: 0, trailing: 24))
                }
                .listStyle(.plain)
                .navigationDestination(for: Composer.self) { ComposerWorksView(composer: $0) }
            }
        case .works:
            listView(works) { list in
                List(list) { work in
                    NavigationLink(value: work) {
                        WorkBrowseRow(work: work)
                    }
                    .listRowSeparator(.hidden)
                    .listRowInsets(EdgeInsets(top: 0, leading: 24, bottom: 0, trailing: 24))
                }
                .listStyle(.plain)
                .navigationDestination(for: WorkBrowseItem.self) { WorkDetailView(workId: $0.id) }
            }
        case .conductors:
            listView(conductors) { list in
                List(list) { conductor in
                    ConductorRow(conductor: conductor)
                        .listRowSeparator(.hidden)
                        .listRowInsets(EdgeInsets(top: 0, leading: 24, bottom: 0, trailing: 24))
                }
                .listStyle(.plain)
            }
        }
    }

    @ViewBuilder
    private func listView<T>(_ state: LoadState<[T]>, @ViewBuilder content: ([T]) -> some View) -> some View {
        switch state {
        case .loading:
            Spacer()
            ProgressView()
            Spacer()
        case .failed(let message):
            Spacer()
            Text(message).foregroundStyle(.secondary)
            Spacer()
        case .loaded(let items) where items.isEmpty:
            Spacer()
            Text("Nothing here yet.").italic().foregroundStyle(Theme.ink.opacity(0.5))
            Spacer()
        case .loaded(let items):
            content(items)
        }
    }

    private func loadComposers() async {
        do {
            composers = .loaded(try await APIClient.shared.composers())
        } catch {
            composers = .failed(error.localizedDescription)
        }
    }

    private func loadTabIfNeeded(_ tab: LibraryTab) async {
        switch tab {
        case .composers:
            if case .loading = composers { await loadComposers() }
        case .works:
            guard case .loading = works else { return }
            do {
                works = .loaded(try await APIClient.shared.allWorks())
            } catch {
                works = .failed(error.localizedDescription)
            }
        case .conductors:
            guard case .loading = conductors else { return }
            do {
                conductors = .loaded(try await APIClient.shared.conductors())
            } catch {
                conductors = .failed(error.localizedDescription)
            }
        }
    }
}

private struct ComposerRow: View {
    let composer: Composer

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(composer.name)
                .font(KochelFont.display(19))
                .foregroundStyle(Theme.ink)
            Text(formatComposerDates(birthYear: composer.birthYear, deathYear: composer.deathYear))
                .font(KochelFont.bodyItalic(13))
                .foregroundStyle(Theme.ink.opacity(0.55))
        }
        .padding(.vertical, 14)
        .overlay(alignment: .bottom) { Rectangle().fill(Theme.divider).frame(height: 1) }
    }
}

private struct WorkBrowseRow: View {
    let work: WorkBrowseItem

    var body: some View {
        HStack(alignment: .firstTextBaseline) {
            Text(work.title)
                .font(KochelFont.body(17))
                .foregroundStyle(Theme.ink)
            Spacer()
            Text(work.composerName)
                .trackedLabel(size: 11)
        }
        .padding(.vertical, 14)
        .overlay(alignment: .bottom) { Rectangle().fill(Theme.divider).frame(height: 1) }
    }
}

private struct ConductorRow: View {
    let conductor: ConductorSummary

    var body: some View {
        HStack(alignment: .firstTextBaseline) {
            Text(conductor.name)
                .font(KochelFont.display(19))
                .foregroundStyle(Theme.ink)
            Spacer()
            Text("\(conductor.recordingCount) \(conductor.recordingCount == 1 ? "recording" : "recordings")")
                .trackedLabel(size: 11)
        }
        .padding(.vertical, 14)
        .overlay(alignment: .bottom) { Rectangle().fill(Theme.divider).frame(height: 1) }
    }
}
