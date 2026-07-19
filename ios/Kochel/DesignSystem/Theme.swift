import SwiftUI

extension Color {
    init(hex: String) {
        let cleaned = hex.trimmingCharacters(in: CharacterSet(charactersIn: "#"))
        var value: UInt64 = 0
        Scanner(string: cleaned).scanHexInt64(&value)
        let r = Double((value >> 16) & 0xFF) / 255
        let g = Double((value >> 8) & 0xFF) / 255
        let b = Double(value & 0xFF) / 255
        self.init(red: r, green: g, blue: b)
    }
}

enum Theme {
    static let ink = Color(hex: "#161513")
    static let paper = Color(hex: "#FAFAF7")
    static let accent = Color(hex: "#B6401F")

    static let divider = ink.opacity(0.12)
}

enum KochelFont {
    static func display(_ size: CGFloat) -> Font {
        .custom("AbrilFatface-Regular", size: size)
    }

    static func body(_ size: CGFloat, weight: Font.Weight = .regular) -> Font {
        switch weight {
        case .medium: return .custom("EBGaramond-Medium", size: size)
        case .semibold: return .custom("EBGaramond-SemiBold", size: size)
        default: return .custom("EBGaramond-Regular", size: size)
        }
    }

    static func bodyItalic(_ size: CGFloat, medium: Bool = false) -> Font {
        medium ? .custom("EBGaramond-MediumItalic", size: size) : .custom("EBGaramond-Italic", size: size)
    }
}

/// Tracked-uppercase label style used throughout ("NOW PLAYING", "MOVEMENTS", etc).
/// Tracking is expressed as an em fraction of the font size, matching the web
/// design tokens (0.16em standard, 0.28em wide).
struct TrackedLabelModifier: ViewModifier {
    var size: CGFloat = 12
    var wide: Bool = false
    var labelOpacity: Double = 0.55

    func body(content: Content) -> some View {
        content
            .font(KochelFont.body(size))
            .foregroundStyle(Theme.ink)
            .textCase(.uppercase)
            .tracking(size * (wide ? 0.28 : 0.16))
            .opacity(labelOpacity)
    }
}

extension View {
    func trackedLabel(size: CGFloat = 12, wide: Bool = false, opacity: Double = 0.55) -> some View {
        modifier(TrackedLabelModifier(size: size, wide: wide, labelOpacity: opacity))
    }
}
