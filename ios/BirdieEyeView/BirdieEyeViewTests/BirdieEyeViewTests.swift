import XCTest
@testable import BirdieEyeView

final class BirdieEyeViewTests: XCTestCase {
    func testToParFormatting() {
        XCTAssertEqual(Formatting.toPar(nil), "—")
        XCTAssertEqual(Formatting.toPar(0), "E")
        XCTAssertEqual(Formatting.toPar(2), "+2")
        XCTAssertEqual(Formatting.toPar(-3), "-3")
    }

    func testDecimalFormatting() {
        XCTAssertEqual(Formatting.decimal(4.26, digits: 1), "4.3")
    }
}
