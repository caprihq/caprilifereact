import WidgetKit
import SwiftUI

/// The extension's entry point. One widget for now; a bundle so a second (a lock
/// screen accessory, say) is an added line rather than a restructure.
@main
struct CapriWidgetBundle: WidgetBundle {
    var body: some Widget {
        CapriWidget()
    }
}
