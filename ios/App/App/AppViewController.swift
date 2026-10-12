import UIKit
import Capacitor
import WebKit

class AppViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        super.capacitorDidLoad()
        if #available(iOS 14.5, *) {
            webView?.configuration.preferences.isTextInteractionEnabled = false
        }
    }
}
