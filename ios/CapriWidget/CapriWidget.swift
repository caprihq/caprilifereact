import WidgetKit
import SwiftUI

/**
 * CAPRI "Daily Priorities" home-screen widget.
 *
 * Same widget users already have from the Capacitor app: same kind, same two
 * families, same layout, same 30-minute cadence.
 *
 * WHERE ITS DATA COMES FROM, AND WHY THAT CHANGED
 *   The old widget fetched its own ranking from the backend on every refresh. Three
 *   things were wrong with that. A phone with no signal drew "Couldn't load tasks".
 *   A task completed in the app stayed on the home screen for up to half an hour,
 *   so the widget and the app disagreed about what to start. And a widget that had
 *   never once succeeded could not recover on a locked phone, because the session
 *   token is deliberately unreadable there.
 *
 *   Now the **app publishes what it is already showing** into shared App Group
 *   storage, and this widget renders that: no network, no credential, instant, and
 *   incapable of disagreeing with Home. Due dates travel with it, so "overdue" is
 *   re-derived at draw time and stays right across midnight without a refresh.
 *
 *   The network path survives as a fallback for one case: nobody has opened CAPRI in
 *   six hours, so the published snapshot can no longer be trusted. That is the only
 *   reason this extension still reads the Keychain.
 *
 * Swift cannot import TypeScript, so the identifiers below are duplicated from the
 * app. `src/config/configConstants.test.ts` fails if they drift.
 */

// MARK: - Shared identifiers (mirrored from the app — see configConstants.test.ts)

private enum CapriShared {
    /// Non-secret shared storage. Same group as the Capacitor widget, so an upgrade
    /// keeps its cache rather than starting blank.
    static let appGroupId = "group.com.base69aa4c4d4f33993320ae7f08.app"

    /// `keychainServiceFor(SECRET_KEYS.accessToken)` in src/services/storage/keys.ts.
    static let tokenService = "com.capri.capri.auth.accessToken"
    /// react-native-keychain files the key name in the account slot.
    static let tokenAccount = "capri.auth.accessToken"

    /// `appBaseUrl` in src/config/base44.config.ts.
    static let feedURL = URL(string: "https://capriforlifev1.base44.app/functions/dailyPrioritiesWidget")!

    /// What the app publishes, and what this widget draws.
    /// `WIDGET_SNAPSHOT_KEY` in modules/capri-app-group/constants.ts.
    static let snapshotKey = "capri_widget_snapshot"

    /// `WIDGET_SNAPSHOT_SCHEMA` — refuse a shape this build cannot read rather than
    /// drawing a blank rectangle on someone's home screen.
    static let snapshotSchema = 1

    /// `WIDGET_SNAPSHOT_MAX_AGE_HOURS` — past this, go to the network instead.
    static let snapshotMaxAgeHours = 6.0

    /**
     * Where a tap goes: the same URL a tapped reminder and a shared link produce.
     *
     * `TASK_LINK_PATH` in modules/capri-deep-link/constants.ts, and the scheme is
     * `authCallbackScheme` in src/config/base44.config.ts. Tapping a widget used to
     * open the app on whatever screen it was last on, which for a widget whose whole
     * job is naming one task is an odd place to land.
     */
    static func taskURL(_ id: String) -> URL? {
        URL(string: "capri://task/\(id)")
    }
}

// MARK: - What the views draw (mirrors logic/widgetSnapshot.ts)

struct WidgetTask: Decodable {
    let id: String
    let title: String
    let priority: String
    let minutes: Int?
    /// Carried so overdue can be recomputed at draw time, with no refresh.
    let due: String?

    var isOverdue: Bool {
        guard let due, let date = ISO8601DateFormatter().date(from: due) else { return false }
        return date < Date()
    }
}

struct WidgetSnapshot: Decodable {
    let schema: Int
    let publishedAt: String
    let hero: WidgetTask?
    let upNext: [WidgetTask]
    /// Open tasks beyond the ones sent. Optional: a snapshot written by an earlier
    /// build carries none, and absent must read as "no more", not as a crash.
    let moreCount: Int?

    var age: TimeInterval {
        guard let published = ISO8601DateFormatter().date(from: publishedAt) else {
            return .greatestFiniteMagnitude
        }
        return Date().timeIntervalSince(published)
    }

    var isUsable: Bool { schema == CapriShared.snapshotSchema }
    var isFresh: Bool { isUsable && age < CapriShared.snapshotMaxAgeHours * 3600 }

    /// How many open tasks this widget is not showing.
    ///
    /// `moreCount` counts what the app left out of the snapshot entirely; rows sent
    /// but not drawn have to be added to it, or a widget rendering two of three sent
    /// rows would claim the third does not exist.
    func remaining(showing rows: Int) -> Int {
        max(0, upNext.count - rows) + (moreCount ?? 0)
    }
}

// MARK: - Feed models (the fallback shape, from base44 dailyPrioritiesWidget)

private struct WidgetFeed: Decodable {
    struct FeedTask: Decodable {
        let id: String
        let title: String
        let priority: String?
        let estimated_minutes: Int?
        let due_date: String?
    }

    let hero: FeedTask?
    let up_next: [FeedTask]?

    /// Rendered through the same model as a published snapshot, so there is one set
    /// of views and one set of states however the data arrived.
    func asSnapshot() -> WidgetSnapshot {
        let convert = { (task: FeedTask) in
            WidgetTask(id: task.id, title: task.title,
                       priority: task.priority ?? "medium",
                       minutes: task.estimated_minutes, due: task.due_date)
        }
        return WidgetSnapshot(
            schema: CapriShared.snapshotSchema,
            publishedAt: ISO8601DateFormatter().string(from: Date()),
            hero: hero.map(convert),
            upNext: (up_next ?? []).map(convert),
            // The network feed sends the whole queue and no total, so what arrived is
            // all there is to know about.
            moreCount: 0
        )
    }
}

// MARK: - Timeline

enum FeedState {
    case loggedOut
    case failed
    case loaded(WidgetSnapshot)
}

struct CapriEntry: TimelineEntry {
    let date: Date
    let state: FeedState
}

/// What the Keychain had to say, which is not the same question as "is there a token".
private enum TokenRead {
    case found(String)
    case missing
    case locked
}

struct CapriProvider: TimelineProvider {
    func placeholder(in context: Context) -> CapriEntry {
        CapriEntry(date: Date(), state: .loaded(WidgetSnapshot(
            schema: CapriShared.snapshotSchema,
            publishedAt: ISO8601DateFormatter().string(from: Date()),
            hero: WidgetTask(id: "1", title: "Prepare investor update",
                             priority: "high", minutes: 45, due: nil),
            upNext: [
                WidgetTask(id: "2", title: "Review Q3 budget", priority: "medium", minutes: 30, due: nil),
                WidgetTask(id: "3", title: "Book dentist appointment", priority: "low", minutes: 10, due: nil),
            ],
            moreCount: 2
        )))
    }

    func getSnapshot(in context: Context, completion: @escaping (CapriEntry) -> Void) {
        if context.isPreview {
            completion(placeholder(in: context))
            return
        }
        Task { completion(await fetchEntry()) }
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<CapriEntry>) -> Void) {
        Task {
            let entry = await fetchEntry()
            let next = Calendar.current.date(byAdding: .minute, value: 30, to: Date())!
            completion(Timeline(entries: [entry], policy: .after(next)))
        }
    }

    // MARK: Shared storage

    private func published() -> WidgetSnapshot? {
        guard let data = UserDefaults(suiteName: CapriShared.appGroupId)?
            .data(forKey: CapriShared.snapshotKey),
              let snapshot = try? JSONDecoder().decode(WidgetSnapshot.self, from: data),
              snapshot.isUsable else { return nil }
        return snapshot
    }

    /// Keep a network answer in the same place, so a phone whose owner never opens
    /// the app still has something to draw on the next refresh.
    private func store(_ snapshot: WidgetSnapshot) {
        guard let data = try? JSONEncoder().encode(StoredSnapshot(from: snapshot)) else { return }
        UserDefaults(suiteName: CapriShared.appGroupId)?.set(data, forKey: CapriShared.snapshotKey)
    }

    // MARK: Token

    /**
     * Read the session token the app stored.
     *
     * `errSecInteractionNotAllowed` is a locked device, not a signed-out user, and
     * the two must never look the same on a home screen.
     */
    private func readToken() -> TokenRead {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: CapriShared.tokenService,
            kSecAttrAccount as String: CapriShared.tokenAccount,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne,
        ]

        var item: CFTypeRef?
        let status = SecItemCopyMatching(query as CFDictionary, &item)

        switch status {
        case errSecSuccess:
            guard let data = item as? Data,
                  let token = String(data: data, encoding: .utf8),
                  !token.isEmpty else { return .missing }
            return .found(token)
        case errSecInteractionNotAllowed:
            return .locked
        default:
            // Includes errSecItemNotFound: no session on this device.
            return .missing
        }
    }

    // MARK: Resolve

    /**
     * Snapshot first, network only when it has gone stale.
     *
     * A stale snapshot always beats an error message: showing yesterday's tasks is
     * useful, and "Couldn't load tasks" is not. Only the complete absence of both a
     * snapshot and a token means signed out.
     */
    private func fetchEntry() async -> CapriEntry {
        let stored = published()

        if let stored, stored.isFresh {
            return CapriEntry(date: Date(), state: .loaded(stored))
        }

        let fallback: FeedState = stored.map { FeedState.loaded($0) } ?? .failed

        let token: String
        switch readToken() {
        case .found(let value):
            token = value
        case .locked:
            // Signed in, unreadable this minute. Draw what we have.
            return CapriEntry(date: Date(), state: fallback)
        case .missing:
            // No session and nothing published: genuinely signed out.
            return CapriEntry(date: Date(), state: stored == nil ? .loggedOut : fallback)
        }

        var request = URLRequest(url: CapriShared.feedURL)
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.timeoutInterval = 15

        do {
            let (data, response) = try await URLSession.shared.data(for: request)
            guard let http = response as? HTTPURLResponse else {
                return CapriEntry(date: Date(), state: fallback)
            }
            if http.statusCode == 401 || http.statusCode == 403 {
                return CapriEntry(date: Date(), state: .loggedOut)
            }
            guard http.statusCode == 200 else {
                return CapriEntry(date: Date(), state: fallback)
            }
            let snapshot = try JSONDecoder().decode(WidgetFeed.self, from: data).asSnapshot()
            store(snapshot)
            return CapriEntry(date: Date(), state: .loaded(snapshot))
        } catch {
            return CapriEntry(date: Date(), state: fallback)
        }
    }
}

/// Encodable mirror of the snapshot, so the widget can write the same shape the app
/// publishes. `WidgetSnapshot` stays decode-only: the app owns the format.
private struct StoredSnapshot: Encodable {
    struct StoredTask: Encodable {
        let id: String
        let title: String
        let priority: String
        let minutes: Int?
        let due: String?
    }

    let schema: Int
    let publishedAt: String
    let hero: StoredTask?
    let upNext: [StoredTask]
    let moreCount: Int?

    init(from snapshot: WidgetSnapshot) {
        let convert = { (task: WidgetTask) in
            StoredTask(id: task.id, title: task.title, priority: task.priority,
                       minutes: task.minutes, due: task.due)
        }
        schema = snapshot.schema
        publishedAt = snapshot.publishedAt
        hero = snapshot.hero.map(convert)
        upNext = snapshot.upNext.map(convert)
        moreCount = snapshot.moreCount
    }
}

// MARK: - Views

private extension View {
    @ViewBuilder func widgetBackground() -> some View {
        if #available(iOSApplicationExtension 17.0, *) {
            containerBackground(for: .widget) { Color(UIColor.systemBackground) }
        } else {
            background(Color(UIColor.systemBackground))
        }
    }
}

private func priorityColor(_ priority: String?) -> Color {
    switch priority {
    case "urgent", "high", "critical": return .red
    case "medium": return .orange
    default: return .blue
    }
}

struct CapriWidgetEntryView: View {
    var entry: CapriEntry
    @Environment(\.widgetFamily) private var family

    var body: some View {
        Group {
            switch entry.state {
            case .loggedOut:
                MessageView(icon: "person.crop.circle.badge.exclamationmark", text: "Open CAPRI to sign in")
            case .failed:
                MessageView(icon: "wifi.exclamationmark", text: "Couldn't load tasks")
            case .loaded(let snapshot):
                if let hero = snapshot.hero {
                    switch family {
                    case .systemMedium:
                        MediumView(hero: hero,
                                   upNext: Array(snapshot.upNext.prefix(2)),
                                   more: snapshot.remaining(showing: 2))
                    default:
                        // Two tasks, no more: the hero and the one behind it. A
                        // single line filled a quarter of the home screen, and three
                        // rows at this size crowd the hero into the same weight as
                        // the queue — which loses the one thing the widget is for.
                        // Rows are not individually tappable at this size (a `Link`
                        // target that small is a mis-tap), so the whole surface opens
                        // the hero.
                        SmallView(hero: hero,
                                  upNext: Array(snapshot.upNext.prefix(1)),
                                  more: snapshot.remaining(showing: 1))
                            .widgetURL(CapriShared.taskURL(hero.id))
                    }
                } else {
                    MessageView(icon: "checkmark.circle.fill", text: "All clear for today 🎉")
                }
            }
        }
        .widgetBackground()
    }
}

struct MessageView: View {
    let icon: String
    let text: String

    var body: some View {
        VStack(spacing: 6) {
            Image(systemName: icon).font(.title3).foregroundStyle(.secondary)
            Text(text).font(.caption).foregroundStyle(.secondary).multilineTextAlignment(.center)
        }
        .padding()
    }
}

/// The hero on its own — the left half of the medium widget.
struct HeroBlock: View {
    let hero: WidgetTask

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: 4) {
                Circle().fill(priorityColor(hero.priority)).frame(width: 7, height: 7)
                Text("START HERE").font(.system(size: 10, weight: .bold)).foregroundStyle(.secondary)
                // Recomputed from the due date every time this draws, so a task that
                // fell overdue overnight says so without any refresh.
                if hero.isOverdue {
                    Text("OVERDUE").font(.system(size: 9, weight: .bold)).foregroundStyle(.red)
                }
            }
            Text(hero.title).font(.system(size: 14, weight: .semibold)).lineLimit(3)
            Spacer(minLength: 0)
            if let mins = hero.minutes {
                Label("\(mins)m", systemImage: "clock").font(.system(size: 10)).foregroundStyle(.secondary)
            }
        }
    }
}

/// "+3 more" — what the widget is not showing, in one quiet line.
///
/// Without it a list of two reads as a complete list of two, and someone with a
/// dozen open tasks has no idea the widget is a summary.
struct MoreRow: View {
    let count: Int

    var body: some View {
        Text("+\(count) more").font(.system(size: 10, weight: .medium)).foregroundStyle(.tertiary)
    }
}

/// One queue row: a priority dot and a title, sized to sit under the hero.
struct QueueRow: View {
    let task: WidgetTask
    let compact: Bool

    var body: some View {
        HStack(spacing: 5) {
            Circle().fill(priorityColor(task.priority)).frame(width: 5, height: 5)
            Text(task.title).font(.system(size: compact ? 10 : 11)).lineLimit(1)
        }
    }
}

struct SmallView: View {
    let hero: WidgetTask
    var upNext: [WidgetTask] = []
    var more: Int = 0

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HeroBlock(hero: hero)
            if !upNext.isEmpty {
                Divider()
                VStack(alignment: .leading, spacing: 3) {
                    ForEach(upNext, id: \.id) { QueueRow(task: $0, compact: true) }
                    if more > 0 { MoreRow(count: more) }
                }
            }
        }
        .padding(2)
    }
}

struct MediumView: View {
    let hero: WidgetTask
    let upNext: [WidgetTask]
    var more: Int = 0

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            HeroBlock(hero: hero).frame(maxWidth: .infinity, alignment: .leading)
            if !upNext.isEmpty {
                Divider()
                VStack(alignment: .leading, spacing: 8) {
                    Text("UP NEXT").font(.system(size: 10, weight: .bold)).foregroundStyle(.secondary)
                    ForEach(upNext, id: \.id) { task in
                        // Each row opens its own task. A single `widgetURL` for the
                        // whole medium widget would send every tap to the hero,
                        // which is worse than not being tappable at all.
                        Link(destination: CapriShared.taskURL(task.id) ?? CapriShared.feedURL) {
                            QueueRow(task: task, compact: false)
                        }
                    }
                    if more > 0 { MoreRow(count: more) }
                    Spacer(minLength: 0)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
        .padding(2)
        // Anything outside a `Link` — the hero half — opens the hero.
        .widgetURL(CapriShared.taskURL(hero.id))
    }
}

// MARK: - Widget definition

struct CapriWidget: Widget {
    /// Unchanged from the Capacitor app, so an existing placed widget keeps working.
    let kind: String = "CapriDailyPriorities"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: CapriProvider()) { entry in
            CapriWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("Daily Priorities")
        .description("Your Start Here task and what's up next.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}
