import WidgetKit
import SwiftUI

// MARK: - App Group
private enum WidgetConstants {
  static let appGroup = "group.com.haenarashin.moeum"
  static let snapshotKey = "widget_quotes_v1"
  static let rotateInterval: TimeInterval = 60 * 60 * 4
}

// MARK: - Models
private struct WidgetQuote: Codable {
  let id: Int
  let body: String
}

private struct WidgetSnapshot: Codable {
  let version: Int
  let generated_at: Double
  let items: [WidgetQuote]
}

private func loadItems() -> [WidgetQuote] {
  guard let defaults = UserDefaults(suiteName: WidgetConstants.appGroup),
        let raw = defaults.string(forKey: WidgetConstants.snapshotKey),
        let data = raw.data(using: .utf8),
        let snap = try? JSONDecoder().decode(WidgetSnapshot.self, from: data) else {
    return []
  }
  return snap.items
}

// MARK: - Entry
struct MoeumEntry: TimelineEntry {
  let date: Date
  let quote: String
}

// MARK: - Provider
struct Provider: TimelineProvider {
  func placeholder(in context: Context) -> MoeumEntry {
    MoeumEntry(date: Date(), quote: "좋은 문장을 모으는 시간")
  }

  func getSnapshot(in context: Context, completion: @escaping (MoeumEntry) -> Void) {
    completion(entry(at: Date(), offset: 0))
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<MoeumEntry>) -> Void) {
    let now = Date()
    var entries: [MoeumEntry] = []
    for i in 0..<6 {
      let date = now.addingTimeInterval(WidgetConstants.rotateInterval * Double(i))
      entries.append(entry(at: date, offset: i))
    }
    let next = now.addingTimeInterval(WidgetConstants.rotateInterval)
    completion(Timeline(entries: entries, policy: .after(next)))
  }

  private func entry(at date: Date, offset: Int) -> MoeumEntry {
    let items = loadItems()
    if items.isEmpty {
      return MoeumEntry(date: date, quote: "모음에서 첫 문장을 추가해보세요")
    }
    let blocks = Int(date.timeIntervalSince1970 / WidgetConstants.rotateInterval)
    let idx = ((offset + blocks) % items.count + items.count) % items.count
    return MoeumEntry(date: date, quote: items[idx].body)
  }
}

// MARK: - View
struct MoeumWidgetEntryView: View {
  var entry: MoeumEntry
  @Environment(\.widgetFamily) var family

  var body: some View {
    VStack(alignment: .leading, spacing: 6) {
      Text(truncated)
        .font(family == .systemSmall ? .system(size: 12) : .system(size: 14))
        .lineSpacing(2)
        .foregroundColor(.primary)
        .multilineTextAlignment(.leading)
      Spacer(minLength: 0)
      HStack {
        Spacer()
        Text("모음")
          .font(.system(size: 10, weight: .semibold))
          .foregroundColor(.secondary)
      }
    }
    .widgetURL(URL(string: "moeum://"))
  }

  private var truncated: String {
    let limit = family == .systemSmall ? 60 : 200
    if entry.quote.count <= limit { return entry.quote }
    let end = entry.quote.index(entry.quote.startIndex, offsetBy: limit)
    return String(entry.quote[..<end]) + "…"
  }
}

// MARK: - Widget
@main
struct MoeumWidget: Widget {
  let kind: String = "MoeumWidget"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: Provider()) { entry in
      MoeumWidgetEntryView(entry: entry)
        .containerBackground(.fill.tertiary, for: .widget)
    }
    .configurationDisplayName("모음")
    .description("저장한 문장 중 하나를 보여줍니다.")
    .supportedFamilies([.systemSmall, .systemMedium])
  }
}
