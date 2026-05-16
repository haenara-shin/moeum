// MoeumWidget.swift — 모음(Moeum) iOS Home/Lock Screen Widget
// PRD §5.1 FR-004, §7 R9 (위젯 메모리 < 30MB)
//
// 데이터 흐름:
// 1) 메인 앱이 quote 저장/수정/삭제 시 moeum-widget-sync 모듈로
//    "오늘의 후보 N개"를 JSON 직렬화해 App Group UserDefaults에 push
// 2) WidgetCenter.shared.reloadAllTimelines() 트리거
// 3) 본 위젯은 TimelineProvider에서 JSON을 읽어 4시간 단위로 회전

import WidgetKit
import SwiftUI

// MARK: - App Group config
private enum WidgetConstants {
  static let appGroup = "group.com.haenarashin.moeum"
  static let snapshotKey = "widget_quotes_v1"
  static let staleAfter: TimeInterval = 60 * 60 * 24  // 24h
  static let rotateInterval: TimeInterval = 60 * 60 * 4  // 4h
  static let maxQueueSize = 20
}

// MARK: - Models
private struct WidgetQuote: Codable, Identifiable {
  let id: Int
  let body: String
}

private struct WidgetSnapshot: Codable {
  let version: Int
  let generated_at: Double  // unix seconds (or ms — TypeScript에서 ms로 직렬화)
  let items: [WidgetQuote]
}

// MARK: - Storage
private func loadSnapshot() -> WidgetSnapshot? {
  let defaults = UserDefaults(suiteName: WidgetConstants.appGroup)
  guard let raw = defaults?.string(forKey: WidgetConstants.snapshotKey),
        let data = raw.data(using: .utf8) else {
    return nil
  }
  do {
    let snap = try JSONDecoder().decode(WidgetSnapshot.self, from: data)
    return snap
  } catch {
    return nil
  }
}

// MARK: - Entry
struct MoeumEntry: TimelineEntry {
  let date: Date
  let quote: String
  let isPlaceholder: Bool
  let isStale: Bool
}

// MARK: - Timeline Provider
struct Provider: TimelineProvider {
  func placeholder(in context: Context) -> MoeumEntry {
    MoeumEntry(
      date: Date(),
      quote: "좋은 문장을 모으는 시간",
      isPlaceholder: true,
      isStale: false
    )
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
      entries.append(
        MoeumEntry(
          date: now,
          quote: items.isEmpty ? "모음에서 첫 문장을 추가해보세요" : "앱을 한 번 열어주세요",
          isPlaceholder: items.isEmpty,
          isStale: isStale && !items.isEmpty
        )
      )
    } else {
      // 4시간 단위로 큐의 다음 문장
      let perRotate = WidgetConstants.rotateInterval
      let lookahead = 6  // 24h 분량 미리 생성
      for i in 0..<lookahead {
        let date = now.addingTimeInterval(perRotate * Double(i))
        let idx = (i + indexForCurrentTime(now: now, count: items.count)) % items.count
        let quote = items[idx].body
        entries.append(
          MoeumEntry(
            date: date,
            quote: quote,
            isPlaceholder: false,
            isStale: false
          )
        )
      }
    }

    let nextRefresh = now.addingTimeInterval(WidgetConstants.rotateInterval)
    completion(Timeline(entries: entries, policy: .after(nextRefresh)))
  }

  private func makeEntry(at date: Date, offset: Int) -> MoeumEntry {
    let snap = loadSnapshot()
    let items = snap?.items ?? []
    if items.isEmpty {
      return MoeumEntry(
        date: date,
        quote: "모음에서 첫 문장을 추가해보세요",
        isPlaceholder: true,
        isStale: false
      )
    }
    let idx = (offset + indexForCurrentTime(now: date, count: items.count)) % items.count
    return MoeumEntry(
      date: date,
      quote: items[idx].body,
      isPlaceholder: false,
      isStale: snap.map { isSnapshotStale($0, now: date) } ?? false
    )
  }

  private func indexForCurrentTime(now: Date, count: Int) -> Int {
    guard count > 0 else { return 0 }
    let blocks = Int(now.timeIntervalSince1970 / WidgetConstants.rotateInterval)
    return ((blocks % count) + count) % count
  }

  private func isSnapshotStale(_ snap: WidgetSnapshot, now: Date) -> Bool {
    // generated_at은 TS의 Date.now()로 ms 단위
    let generated = snap.generated_at / 1000
    let age = now.timeIntervalSince1970 - generated
    return age > WidgetConstants.staleAfter
  }
}

// MARK: - Views
struct MoeumWidgetEntryView: View {
  var entry: Provider.Entry
  @Environment(\.widgetFamily) var family

  var body: some View {
    let limit = family == .systemSmall ? 60 : 200
    let bodyText = truncate(entry.quote, max: limit)
    VStack(alignment: .leading, spacing: 6) {
      Text(bodyText)
        .font(font(for: family))
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
    .containerBackground(for: .widget) {
      Color("$widgetBackground")
    }
  }

  private func font(for family: WidgetFamily) -> Font {
    switch family {
    case .systemSmall: return .system(size: 12, weight: .regular)
    case .systemMedium: return .system(size: 14, weight: .regular)
    default: return .system(size: 14)
    }
  }

  private func truncate(_ s: String, max: Int) -> String {
    if s.count <= max { return s }
    let end = s.index(s.startIndex, offsetBy: max)
    return String(s[..<end]) + "…"
  }
}

// MARK: - Widget
@main
struct MoeumWidget: Widget {
  let kind: String = "MoeumWidget"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: Provider()) { entry in
      MoeumWidgetEntryView(entry: entry)
    }
    .configurationDisplayName("모음")
    .description("저장한 문장 중 하나를 보여줍니다.")
    .supportedFamilies([.systemSmall, .systemMedium])
    .contentMarginsDisabled()
  }
}
