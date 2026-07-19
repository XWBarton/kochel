import SwiftUI

struct SettingsView: View {
    @Environment(AppSettings.self) private var settings
    @Environment(\.dismiss) private var dismiss
    @State private var urlText = ""

    var body: some View {
        NavigationStack {
            VStack(alignment: .leading, spacing: 10) {
                Text("SERVER").trackedLabel(size: 11, wide: true)
                Text("Defaults to localhost, which reaches your Mac's Docker stack automatically in Simulator. On a physical device, point this at your server's LAN address.")
                    .font(KochelFont.bodyItalic(13))
                    .foregroundStyle(Theme.ink.opacity(0.6))
                TextField("http://192.168.1.10:8000", text: $urlText)
                    .font(KochelFont.body(17))
                    .keyboardType(.URL)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
                    .padding(.bottom, 8)
                    .overlay(alignment: .bottom) { Rectangle().fill(Theme.ink).frame(height: 1) }
                    .accessibilityIdentifier("server-url-field")
            }
            .padding(24)
            .padding(.top, 12)
            .frame(maxHeight: .infinity, alignment: .top)
            .background(Theme.paper)
            .navigationTitle("Settings")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        settings.serverURLString = urlText
                        dismiss()
                    }
                }
            }
            .onAppear { urlText = settings.serverURLString }
        }
    }
}
