import SwiftUI

struct SearchView: View {
    @State private var query = ""
    @State private var results: SearchResponse?
    @State private var searchTask: Task<Void, Never>?
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                TextField("Search composers, works, recordings…", text: $query)
                    .font(KochelFont.body(20))
                    .padding(.bottom, 12)
                    .overlay(alignment: .bottom) { Rectangle().fill(Theme.ink).frame(height: 1) }
                    .padding(.horizontal, 24)
                    .padding(.top, 20)
                    .onChange(of: query) { _, newValue in
                        searchTask?.cancel()
                        searchTask = Task {
                            try? await Task.sleep(for: .milliseconds(250))
                            guard !Task.isCancelled else { return }
                            await runSearch(newValue)
                        }
                    }

                ScrollView {
                    VStack(alignment: .leading, spacing: 24) {
                        if let results {
                            if !results.composers.isEmpty {
                                group("COMPOSERS") {
                                    ForEach(results.composers) { c in
                                        NavigationLink(value: c) {
                                            HStack(alignment: .firstTextBaseline) {
                                                HStack(spacing: 8) {
                                                    Text(c.name).font(KochelFont.display(19))
                                                    Text(formatComposerDates(birthYear: c.birthYear, deathYear: c.deathYear))
                                                        .font(KochelFont.bodyItalic(13)).opacity(0.55)
                                                }
                                                Spacer()
                                                Text("\(c.workCount)").trackedLabel(size: 11)
                                            }
                                        }
                                        .foregroundStyle(Theme.ink)
                                        .rowDivider()
                                    }
                                }
                            }
                            if !results.works.isEmpty {
                                group("WORKS") {
                                    ForEach(results.works) { w in
                                        NavigationLink(value: w) {
                                            HStack(alignment: .firstTextBaseline) {
                                                Text(w.title).font(KochelFont.body(16))
                                                Spacer()
                                                Text(w.composerName).trackedLabel(size: 11)
                                            }
                                        }
                                        .foregroundStyle(Theme.ink)
                                        .rowDivider()
                                    }
                                }
                            }
                            if !results.recordings.isEmpty {
                                group("RECORDINGS") {
                                    ForEach(results.recordings) { r in
                                        NavigationLink(value: SearchWorkResult(id: r.workId, title: r.workTitle, composerId: 0, composerName: r.composerName)) {
                                            HStack(alignment: .firstTextBaseline) {
                                                Text([r.ensembleName, r.conductorName].compactMap { $0 }.joined(separator: " · "))
                                                    .font(KochelFont.body(16))
                                                Spacer()
                                                Text(r.workTitle).trackedLabel(size: 11)
                                            }
                                        }
                                        .foregroundStyle(Theme.ink)
                                        .rowDivider()
                                    }
                                }
                            }
                            if results.composers.isEmpty && results.works.isEmpty && results.recordings.isEmpty {
                                Text("No results for \"\(results.query)\".").italic().opacity(0.6).padding(.top, 20)
                            }
                        }
                    }
                    .padding(.horizontal, 24)
                    .padding(.top, 20)
                }
            }
            .background(Theme.paper)
            .navigationDestination(for: SearchComposerResult.self) { c in
                ComposerWorksView(composer: Composer(id: c.id, name: c.name, sortName: c.name, birthYear: c.birthYear, deathYear: c.deathYear, period: nil, workCount: c.workCount))
            }
            .navigationDestination(for: SearchWorkResult.self) { WorkDetailView(workId: $0.id) }
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }

    @ViewBuilder
    private func group(_ label: String, @ViewBuilder content: () -> some View) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(label).trackedLabel(size: 12, wide: true)
            content()
        }
    }

    private func runSearch(_ text: String) async {
        let trimmed = text.trimmingCharacters(in: .whitespaces)
        guard !trimmed.isEmpty else {
            results = nil
            return
        }
        results = try? await APIClient.shared.search(trimmed)
    }
}

private struct RowDivider: ViewModifier {
    func body(content: Content) -> some View {
        content
            .padding(.vertical, 12)
            .overlay(alignment: .bottom) { Rectangle().fill(Theme.divider).frame(height: 1) }
    }
}

extension View {
    fileprivate func rowDivider() -> some View { modifier(RowDivider()) }
}
