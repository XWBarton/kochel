import XCTest

/// Not a CI test suite — a one-off visual verification harness. Taps through
/// the real navigation flow against the live dev backend and drops
/// screenshots to /tmp so they can be inspected directly, since simctl has
/// no built-in tap injection.
final class KochelUITests: XCTestCase {
    override func setUpWithError() throws {
        continueAfterFailure = false
    }

    private func save(_ name: String) {
        let image = XCUIScreen.main.screenshot().image
        let url = URL(fileURLWithPath: "/tmp/ios_screenshots/\(name).png")
        try? image.pngData()?.write(to: url)
    }

    private func firstElement(withPrefix prefix: String, in app: XCUIApplication) -> XCUIElement {
        app.descendants(matching: .any)
            .matching(NSPredicate(format: "identifier BEGINSWITH %@", prefix))
            .firstMatch
    }

    func testNavigationFlow() throws {
        let app = XCUIApplication()
        app.launch()

        let firstComposer = firstElement(withPrefix: "composer-row-", in: app)
        XCTAssertTrue(firstComposer.waitForExistence(timeout: 10))
        save("10-library-home")

        firstComposer.tap()

        let firstWork = firstElement(withPrefix: "work-row-", in: app)
        XCTAssertTrue(firstWork.waitForExistence(timeout: 10))
        save("11-composer-works")

        firstWork.tap()

        let playButton = firstElement(withPrefix: "play-recording-", in: app)
        XCTAssertTrue(playButton.waitForExistence(timeout: 10))
        save("12-work-detail")

        playButton.tap()

        let miniPlayer = app.descendants(matching: .any).matching(identifier: "mini-player-bar").firstMatch
        XCTAssertTrue(miniPlayer.waitForExistence(timeout: 10))
        // let a couple of seconds of real playback elapse so progress/elapsed-time show real values
        Thread.sleep(forTimeInterval: 2)
        save("13-work-detail-playing")

        miniPlayer.tap()

        let movementRow = firstElement(withPrefix: "now-playing-movement-", in: app)
        XCTAssertTrue(movementRow.waitForExistence(timeout: 10))
        Thread.sleep(forTimeInterval: 1)
        save("14-now-playing")

        // exercise movement-jump interaction
        let allMovementRows = app.descendants(matching: .any)
            .matching(NSPredicate(format: "identifier BEGINSWITH 'now-playing-movement-'"))
        if allMovementRows.count > 1 {
            allMovementRows.element(boundBy: 1).tap()
            Thread.sleep(forTimeInterval: 1)
            save("15-now-playing-jumped")
        }

        app.descendants(matching: .any).matching(identifier: "now-playing-dismiss").firstMatch.tap()
        Thread.sleep(forTimeInterval: 1)
        save("16-back-to-work-detail")
    }

    func testSearchAndDownloads() throws {
        let app = XCUIApplication()
        app.launch()

        app.descendants(matching: .any).matching(identifier: "open-search").firstMatch.tap()
        let searchField = app.textFields.firstMatch
        XCTAssertTrue(searchField.waitForExistence(timeout: 10))
        searchField.tap()
        searchField.typeText("Bach")
        Thread.sleep(forTimeInterval: 1)
        save("20-search-results")
        app.buttons["Done"].tap()

        app.descendants(matching: .any).matching(identifier: "open-downloads").firstMatch.tap()
        Thread.sleep(forTimeInterval: 1)
        save("21-downloads-empty")
    }

    func testDownloadFlow() throws {
        let app = XCUIApplication()
        app.launch()

        firstElement(withPrefix: "composer-row-", in: app).tap()
        firstElement(withPrefix: "work-row-", in: app).tap()

        let downloadButton = firstElement(withPrefix: "download-recording-", in: app)
        XCTAssertTrue(downloadButton.waitForExistence(timeout: 10))
        downloadButton.tap()
        save("30-download-started")

        // poll for completion (checkmark replaces the download button once done)
        let deadline = Date().addingTimeInterval(20)
        while Date() < deadline {
            if !downloadButton.exists { break }
            Thread.sleep(forTimeInterval: 0.5)
        }
        save("31-download-complete-work-detail")

        // pop back twice (Work Detail -> Composer Works -> Library Home) —
        // the downloads button lives in Library Home's header, not on a
        // pushed detail screen
        app.navigationBars.buttons.firstMatch.tap()
        app.navigationBars.buttons.firstMatch.tap()

        let downloadsButton = app.descendants(matching: .any).matching(identifier: "open-downloads").firstMatch
        XCTAssertTrue(downloadsButton.waitForExistence(timeout: 10))
        downloadsButton.tap()
        Thread.sleep(forTimeInterval: 1)
        save("32-downloads-populated")
    }

    /// Screenshots taken seconds apart while a movement plays, to visually
    /// confirm the needle dot is actually spiraling inward (radius shrinking)
    /// and not just statically positioned.
    func testNowPlayingAnimation() throws {
        let app = XCUIApplication()
        app.launch()

        firstElement(withPrefix: "composer-row-", in: app).tap()
        firstElement(withPrefix: "work-row-", in: app).tap()
        firstElement(withPrefix: "play-recording-", in: app).tap()

        let miniPlayer = app.descendants(matching: .any).matching(identifier: "mini-player-bar").firstMatch
        XCTAssertTrue(miniPlayer.waitForExistence(timeout: 10))
        miniPlayer.tap()

        let movementRow = firstElement(withPrefix: "now-playing-movement-", in: app)
        XCTAssertTrue(movementRow.waitForExistence(timeout: 10))

        Thread.sleep(forTimeInterval: 0.5)
        save("40-needle-early")
        Thread.sleep(forTimeInterval: 2.0)
        save("41-needle-later")
    }
}
