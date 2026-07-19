import Foundation

private let romanNumerals: [(Int, String)] = [
    (1000, "M"), (900, "CM"), (500, "D"), (400, "CD"),
    (100, "C"), (90, "XC"), (50, "L"), (40, "XL"),
    (10, "X"), (9, "IX"), (5, "V"), (4, "IV"), (1, "I"),
]

func toRoman(_ n: Int) -> String {
    var remaining = n
    var result = ""
    for (value, symbol) in romanNumerals {
        while remaining >= value {
            result += symbol
            remaining -= value
        }
    }
    return result
}

func formatDuration(_ totalSeconds: Double) -> String {
    let seconds = max(0, Int(totalSeconds.rounded()))
    let h = seconds / 3600
    let m = (seconds % 3600) / 60
    let s = seconds % 60
    if h > 0 {
        return String(format: "%d:%02d:%02d", h, m, s)
    }
    return String(format: "%d:%02d", m, s)
}

func formatComposerDates(birthYear: Int?, deathYear: Int?) -> String {
    if birthYear == nil && deathYear == nil { return "" }
    if let death = deathYear {
        return "\(birthYear.map(String.init) ?? "?")–\(death)"
    }
    if let birth = birthYear {
        return "b. \(birth)"
    }
    return ""
}

func firstLetter(_ sortName: String) -> String {
    let trimmed = sortName.trimmingCharacters(in: .whitespaces)
    guard let first = trimmed.first else { return "?" }
    return String(first).uppercased()
}
