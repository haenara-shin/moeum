import ExpoModulesCore
import WidgetKit
import Foundation

// 모음(Moeum) App ↔ Widget Bridge
// - setSnapshot(jsonString): App Group UserDefaults에 JSON 스냅샷 push
// - reloadWidgets(kind?): WidgetCenter 리프레시 트리거
//
// JSON 스냅샷 키: "widget_quotes_v1"
// 메인 앱이 quote CRUD 후 호출 → 위젯 Provider가 다음 timeline에서 읽음.

public class MoeumWidgetSyncModule: Module {
  private static let appGroup = "group.com.haenarashin.moeum"
  private static let snapshotKey = "widget_quotes_v1"

  public func definition() -> ModuleDefinition {
    Name("MoeumWidgetSyncModule")

    Constants([
      "appGroup": Self.appGroup,
      "snapshotKey": Self.snapshotKey
    ])

    AsyncFunction("setSnapshot") { (jsonString: String) -> Bool in
      guard let defaults = UserDefaults(suiteName: Self.appGroup) else {
        return false
      }
      defaults.set(jsonString, forKey: Self.snapshotKey)
      return true
    }

    AsyncFunction("reloadWidgets") { (kind: String?) in
      if #available(iOS 14.0, *) {
        if let kind = kind, !kind.isEmpty {
          WidgetCenter.shared.reloadTimelines(ofKind: kind)
        } else {
          WidgetCenter.shared.reloadAllTimelines()
        }
      }
    }

    AsyncFunction("getSnapshot") { () -> String? in
      let defaults = UserDefaults(suiteName: Self.appGroup)
      return defaults?.string(forKey: Self.snapshotKey)
    }
  }
}
