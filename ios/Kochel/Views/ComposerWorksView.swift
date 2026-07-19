import SwiftUI

struct ComposerWorksView: View {
    let composer: Composer
    @State private var works: LoadState<[WorkListItem]> = .loading

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                header
                switch works {
                case .loading:
                    ProgressView().padding(.top, 40)
                case .failed(let message):
                    Text(message).foregroundStyle(.secondary).padding(.top, 40)
                case .loaded(let items):
                    ForEach(groupByCategory(items), id: \.category) { group in
                        Text(group.category.uppercased())
                            .trackedLabel(size: 12, wide: true)
                            .padding(.top, 20)
                            .padding(.bottom, 6)
                        ForEach(group.works) { work in
                            NavigationLink(value: work) {
                                WorkRow(work: work)
                            }
                            .accessibilityIdentifier("work-row-\(work.id)")
                        }
                    }
                }
            }
            .padding(.horizontal, 24)
            .padding(.bottom, 40)
        }
        .background(Theme.paper)
        .navigationDestination(for: WorkListItem.self) { WorkDetailView(workId: $0.id) }
        .task {
            do {
                works = .loaded(try await APIClient.shared.works(forComposer: composer.id))
            } catch {
                works = .failed(error.localizedDescription)
            }
        }
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(composer.name)
                .font(KochelFont.display(36))
                .foregroundStyle(Theme.ink)
            Text([formatComposerDates(birthYear: composer.birthYear, deathYear: composer.deathYear), composer.period]
                .compactMap { $0 }.filter { !$0.isEmpty }.joined(separator: " · "))
                .font(KochelFont.bodyItalic(14))
                .foregroundStyle(Theme.ink.opacity(0.6))
        }
        .padding(.top, 24)
        .padding(.bottom, 16)
        .overlay(alignment: .bottom) { Rectangle().fill(Theme.ink).frame(height: 1) }
    }
}

private struct WorkGroup {
    let category: String
    var works: [WorkListItem]
}

private func groupByCategory(_ works: [WorkListItem]) -> [WorkGroup] {
    var groups: [WorkGroup] = []
    for work in works {
        let category = work.category ?? "Other"
        if groups.last?.category == category {
            groups[groups.count - 1].works.append(work)
        } else {
            groups.append(WorkGroup(category: category, works: [work]))
        }
    }
    return groups
}

private struct WorkRow: View {
    let work: WorkListItem

    var body: some View {
        HStack(spacing: 12) {
            PlayTriangle()
            Text(work.title)
                .font(KochelFont.body(17))
                .foregroundStyle(Theme.ink)
            Spacer()
            Text("\(work.recordingCount)")
                .trackedLabel(size: 11)
        }
        .padding(.vertical, 12)
        .frame(minHeight: 44)
        .overlay(alignment: .bottom) { Rectangle().fill(Theme.divider).frame(height: 1) }
    }
}

struct PlayTriangle: View {
    var body: some View {
        Triangle()
            .fill(Theme.accent)
            .frame(width: 10, height: 12)
    }
}

struct Triangle: Shape {
    func path(in rect: CGRect) -> Path {
        var path = Path()
        path.move(to: CGPoint(x: 0, y: 0))
        path.addLine(to: CGPoint(x: rect.width, y: rect.height / 2))
        path.addLine(to: CGPoint(x: 0, y: rect.height))
        path.closeSubpath()
        return path
    }
}
