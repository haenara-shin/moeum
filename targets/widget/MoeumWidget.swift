// MoeumWidget.swift — 모음(Moeum) iOS Home/Lock Screen Widget
// PRD §5.1 FR-004, §7 R9 (위젯 메모리 < 30MB)

import WidgetKit
import SwiftUI

// MARK: - App Group config
private enum WidgetConstants {
  static let appGroup = "group.com.haenarashin.moeum"
  static let snapshotKey = "widget_quotes_v1"
  static let staleAfter: TimeInterval = 60 * 60 * 24
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

private func loadSnapshot() -> WidgetSnapshot? {
  guard let defaults = UserDefaults(suiteName: WidgetConstants.appGroup),
        let raw = defaults.string(forKey: WidgetConstants.snapshotKey),
        let data = raw.data(using: .utf8) else {
    return nil
  }
  return try? JSONDecoder().decode(WidgetSnapshot.self, from: data)
}

// MARK: - Entry
struct MoeumEntry: TimelineEntry {
  let date: Date
  let quote: String
  let isPlaceholder: Bool
}

// MARK: - Timeline Provider
struct Provider: TimelineProvider {
  func placeholder(in context: Context) -> MoeumEntry {
    MoeumEntry(date: Date(), quote: "좋은 문장을 모으는 시간", isPlaceholder: true)
  }

  func getSnapshot(in context: Context, completion: @escaping (MoeumEntry) -> Void) {
    completion(makeEntry(at: Date(), offset: 0))
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<MoeumEntry>) -> Void) {
    let now = Date()
    let snap = loadSnapshot()
    let items = snap?.items ?? []
    let isStale = snap.map { isSnapshotStale($0, now: now) } ?? true

    var entries: [MoeumEntry] = []
    if items.isEmpty || isStale {
      let message = items.isEmpty ? "모음에서 첫 문장을 추가해보세요" : "앱을 한 번 열어주세요"
      entries.append(MoeumEntry(date: now, quote: message, isPlaceholder: items.isEmpty))
    } else {
      let lookahead = 6
      for i in 0..<lookahead {
        let date = now.addingTimeInterval(WidgetConstants.rotateInterval * Double(i))
        let idx = (i + indexForCurrentTime(now: now, count: items.count)) % items.count
        entries.append(MoeumEntry(date: date, quote: items[idx].body, isPlaceholder: false))
      }
    }

    let nextRefresh = now.addingTimeInterval(WidgetConstants.rotateInterval)
    completion(Timeline(entries: entries, policy: .after(nextRefresh)))
  }

  private func makeEntry(at date: Date, offset: Int) -> MoeumEntry {
    let snap = loadSnapshot()
    let items = snap?.items ?? []
    if items.isEmpty {
      return MoeumEntry(date: date, quote: "모음에서 첫 문장을 추가해보세요", isPlaceholder: true)
    }
    let idx = (offset + indexForCurrentTime(now: date, count: items.count)) % items.count
    return MoeumEntry(date: date, quote: items[idx].body, isPlaceholder: false)
  }

  private func indexForCurrentTime(now: Date, count: Int) -> Int {
    guard count > 0 else { return 0 }
    let blocks = Int(now.timeIntervalSince1970 / WidgetConstants.rotateInterval)
    return ((blocks % count) + count) % count
  }

  private func isSnapshotStale(_ snap: WidgetSnapshot, now: Date) -> Bool {
    let generated = snap.generated_at / 1000
    return now.timeIntervalSince1970 - generated > WidgetConstants.staleAfter
  }
}

// MARK: - Views
private func truncate(_ s: String, max: Int) -> String {
  if s.count <= max { return s }
  let end = s.index(s.startIndex, offsetBy: max)
  return String(s[..<end]) + "…"
}

struct MoeumWidgetEntryView: View {
  var entry: Provider.Entry
  @Environment(\.widgetFamily) var family

  var body: some View {
    let limit = family == .systemSmall ? 60 : 200
    let bodyText = truncate(entry.quote, max: limit)

    VStack(alignment: .leading, spacing: 6) {
      Text(bodyText)
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
    .padding(family == .systemSmall ? 12 : 16)
    .widgetURL(URL(string: "moeum://"))
  }
}

// MARK: - Widget
@main
struct MoeumWidget: Widget {
  let kind: String = "MoeumWidget"

  var body: some WidgetConfiguration {
    if #available(iOS 17.0, *) {
      return StaticConfiguration(kind: kind, provider: Provider()) { entry in
        MoeumWidgetEntryView(entry: entry)
          .containerBackground(.fill.tertiary, for: .widget)
      }
      .configurationDisplayName("모음")
      .description("저장한 문장 중 하나를 보여줍니다.")
      .supportedFamilies([.systemSmall, .systemMedium])
    } else {
      return StaticConfiguration(kind: kind, provider: Provider()) { entry in
        MoeumWidgetEntryView(entry: entry)
          .padding()
          .background(Color(.systemBackground))
      }
      .configurationDisplayName("모음")
      .description("저장한 문장 중 하나를 보여줍니다.")
      .supportedFamilies([.systemSmall, .systemMedium])
    }
  }
}
