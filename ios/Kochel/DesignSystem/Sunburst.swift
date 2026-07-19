import SwiftUI

/// The record-label sunburst motif — concentric circles + 24 radiating
/// hairlines + a center accent dot. Drawn in a 200x200 logical space (matching
/// the web SVG viewBox) and scaled to fit whatever frame it's given.
///
/// While playing, the disc spins slowly and (when `progress` is supplied) a
/// needle dot spirals from the outer edge toward the center over the course
/// of the movement — the needle sits outside the rotating disc, since on a
/// real turntable the tonearm doesn't spin with the record.
struct Sunburst: View {
    var foreground: Color
    var accent: Color
    var showRays: Bool = true
    var isPlaying: Bool = false
    /// 0...1 through the current movement; when set, draws the needle dot.
    var progress: Double? = nil

    @State private var isRotating = false

    private static let needleAngleDegrees = -18.0
    private static let needleOuterRadius = 88.0
    private static let needleInnerRadius = 8.0

    var body: some View {
        GeometryReader { geo in
            ZStack {
                disc
                    .rotationEffect(.degrees(isRotating ? 360 : 0))
                    .animation(
                        isRotating ? .linear(duration: 10).repeatForever(autoreverses: false) : .default,
                        value: isRotating
                    )

                if let progress {
                    needle(progress: progress, size: geo.size.width)
                }
            }
        }
        .onAppear { isRotating = isPlaying }
        .onChange(of: isPlaying) { _, playing in isRotating = playing }
    }

    private var disc: some View {
        Canvas { context, canvasSize in
            let scale = canvasSize.width / 200
            let lineWidth = 1 / scale

            context.scaleBy(x: scale, y: scale)

            let outer = Path(ellipseIn: CGRect(x: 5, y: 5, width: 190, height: 190))
            context.stroke(outer, with: .color(foreground.opacity(0.5)), lineWidth: lineWidth)

            if showRays {
                for i in 0..<24 {
                    context.drawLayer { layer in
                        layer.translateBy(x: 100, y: 100)
                        layer.rotate(by: .degrees(Double(i) * 15))
                        var ray = Path()
                        ray.move(to: CGPoint(x: 0, y: -94))
                        ray.addLine(to: CGPoint(x: 0, y: -72))
                        layer.stroke(ray, with: .color(foreground.opacity(0.55)), lineWidth: lineWidth)
                    }
                }
            }

            let inner = Path(ellipseIn: CGRect(x: 42, y: 42, width: 116, height: 116))
            context.stroke(inner, with: .color(foreground.opacity(0.5)), lineWidth: lineWidth)

            let dot = Path(ellipseIn: CGRect(x: 95, y: 95, width: 10, height: 10))
            context.fill(dot, with: .color(accent))
        }
    }

    private func needle(progress: Double, size: CGFloat) -> some View {
        let clamped = min(max(progress, 0), 1)
        let r = Self.needleOuterRadius - (Self.needleOuterRadius - Self.needleInnerRadius) * clamped
        let angleRad = Self.needleAngleDegrees * .pi / 180
        let scale = size / 200
        let x = size / 2 + r * sin(angleRad) * scale
        let y = size / 2 - r * cos(angleRad) * scale

        return Circle()
            .fill(accent)
            .frame(width: 8 * scale, height: 8 * scale)
            .position(x: x, y: y)
    }
}

#Preview {
    Sunburst(foreground: Theme.ink, accent: Theme.accent, isPlaying: true, progress: 0.4)
        .frame(width: 320, height: 320)
        .padding()
        .background(Theme.paper)
}
