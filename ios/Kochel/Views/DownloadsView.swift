import SwiftUI

struct DownloadsView: View {
    @Environment(DownloadManager.self) private var downloads
    @Environment(\.dismiss) private var dismiss

    private var usedFraction: Double {
        guard downloads.deviceTotalBytes > 0 else { return 0 }
        return min(1, Double(downloads.totalDownloadedBytes) / Double(downloads.deviceTotalBytes))
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    storageBar

                    ForEach(downloads.downloaded) { item in
                        DownloadedRow(item: item)
                    }

                    ForEach(Array(downloads.activeDownloads), id: \.self) { trackId in
                        InProgressRow(trackId: trackId, progress: downloads.progress[trackId] ?? 0)
                    }

                    if downloads.downloaded.isEmpty && downloads.activeDownloads.isEmpty {
                        Text("No downloads yet. Download a recording from its Work page to listen offline.")
                            .font(KochelFont.bodyItalic(15))
                            .foregroundStyle(Theme.ink.opacity(0.55))
                            .padding(.top, 20)
                    }
                }
                .padding(.horizontal, 24)
                .padding(.top, 20)
                .padding(.bottom, 40)
            }
            .background(Theme.paper)
            .navigationTitle("Downloads")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }

    private var storageBar: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text("STORAGE USED").trackedLabel(size: 11, wide: true)
                Spacer()
                Text(byteString(downloads.totalDownloadedBytes))
                    .font(.system(size: 12).monospacedDigit())
                    .opacity(0.6)
            }
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    Rectangle().fill(Theme.divider).frame(height: 1)
                    Rectangle().fill(Theme.accent).frame(width: geo.size.width * usedFraction, height: 1)
                }
            }
            .frame(height: 1)
        }
    }
}

private struct DownloadedRow: View {
    let item: DownloadedTrack

    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                Text(item.workTitle).font(KochelFont.body(16)).foregroundStyle(Theme.ink)
                Text(item.composerName).trackedLabel(size: 11)
            }
            Spacer()
            Text(byteString(item.fileSizeBytes))
                .font(.system(size: 12).monospacedDigit())
                .opacity(0.55)
            Text(item.isLossless ? "LOSSLESS" : "HIGH")
                .font(.system(size: 9, weight: .medium))
                .tracking(1)
                .padding(.horizontal, 6)
                .padding(.vertical, 3)
                .overlay(RoundedRectangle(cornerRadius: 2).stroke(Theme.ink.opacity(0.3), lineWidth: 1))
        }
        .padding(.vertical, 10)
        .overlay(alignment: .bottom) { Rectangle().fill(Theme.divider).frame(height: 1) }
    }
}

private struct InProgressRow: View {
    let trackId: Int
    let progress: Double

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text("Downloading track #\(trackId)…").font(KochelFont.body(16)).foregroundStyle(Theme.ink)
                Spacer()
                Text("\(Int(progress * 100))%")
                    .font(.system(size: 12).monospacedDigit())
                    .foregroundStyle(Theme.accent)
            }
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    Rectangle().fill(Theme.divider).frame(height: 1)
                    Rectangle().fill(Theme.accent).frame(width: geo.size.width * progress, height: 1)
                }
            }
            .frame(height: 1)
        }
        .padding(.vertical, 10)
        .overlay(alignment: .bottom) { Rectangle().fill(Theme.divider).frame(height: 1) }
    }
}

private func byteString(_ bytes: Int64) -> String {
    ByteCountFormatter.string(fromByteCount: bytes, countStyle: .file)
}
