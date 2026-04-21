import { useState } from "react";
import Icon from "@/components/ui/icon";

type View = "calendar" | "notifications";

interface CalEvent {
  id: string;
  title: string;
  time: string;
  type: "meeting" | "task" | "reminder";
  day: number;
}

interface Notification {
  id: string;
  text: string;
  time: string;
  read: boolean;
  type: "sync" | "reminder" | "update";
}

const DAYS_RU = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const MONTHS_RU = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
];

const initialEvents: CalEvent[] = [
  { id: "1", title: "Созвон с командой", time: "10:00", type: "meeting", day: 21 },
  { id: "2", title: "Обед с клиентом", time: "13:00", type: "meeting", day: 21 },
  { id: "3", title: "Квартальный отчёт", time: "16:00", type: "task", day: 22 },
  { id: "4", title: "Планирование спринта", time: "09:00", type: "meeting", day: 23 },
  { id: "5", title: "Проверить задачи", time: "11:30", type: "reminder", day: 24 },
  { id: "6", title: "Презентация продукта", time: "15:00", type: "meeting", day: 25 },
];

const initialNotifications: Notification[] = [
  { id: "1", text: "Данные синхронизированы со всеми устройствами", time: "Только что", read: false, type: "sync" },
  { id: "2", text: "Напоминание: Созвон с командой через 30 минут", time: "9:30", read: false, type: "reminder" },
  { id: "3", text: "Новое событие добавлено с iPhone", time: "Вчера", read: true, type: "sync" },
  { id: "4", text: "Еженедельный дайджест готов", time: "Пн", read: true, type: "update" },
  { id: "5", text: "Напоминание: Квартальный отчёт завтра", time: "Пн", read: true, type: "reminder" },
];

const typeColors: Record<string, string> = {
  meeting: "#2563eb",
  task: "#16a34a",
  reminder: "#d97706",
};

const notifIcons: Record<string, string> = {
  sync: "RefreshCw",
  reminder: "Bell",
  update: "FileText",
};

// April 2026: first day is Wednesday → offset = 2
const APRIL_OFFSET = 2;
const APRIL_DAYS = 30;

export default function Index() {
  const [view, setView] = useState<View>("calendar");
  const [selectedDay, setSelectedDay] = useState(21);
  const [notifications, setNotifications] = useState(initialNotifications);
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [newEventTitle, setNewEventTitle] = useState("");
  const [newEventTime, setNewEventTime] = useState("10:00");
  const [events, setEvents] = useState(initialEvents);

  const dayEvents = events.filter((e) => e.day === selectedDay);
  const unreadCount = notifications.filter((n) => !n.read).length;

  function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  function addEvent() {
    if (!newEventTitle.trim()) return;
    setEvents((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        title: newEventTitle,
        time: newEventTime,
        type: "task",
        day: selectedDay,
      },
    ]);
    setNotifications((prev) => [
      {
        id: Date.now().toString(),
        text: `Добавлено «${newEventTitle}» — синхронизация на устройства...`,
        time: "Только что",
        read: false,
        type: "sync",
      },
      ...prev,
    ]);
    setNewEventTitle("");
    setNewEventTime("10:00");
    setShowAddEvent(false);
  }

  return (
    <div className="plannerka-shell">
      {/* ── Sidebar ─────────────────────────────── */}
      <aside className="plannerka-sidebar">
        <div className="pk-logo">
          <div className="pk-logo-mark">П</div>
          <span className="pk-logo-name">Планёрка</span>
        </div>

        <nav className="pk-nav">
          <button
            className={`pk-nav-item ${view === "calendar" ? "pk-active" : ""}`}
            onClick={() => setView("calendar")}
          >
            <Icon name="CalendarDays" size={18} />
            <span>Календарь</span>
          </button>

          <button
            className={`pk-nav-item ${view === "notifications" ? "pk-active" : ""}`}
            onClick={() => setView("notifications")}
          >
            <Icon name="Bell" size={18} />
            <span>Уведомления</span>
            {unreadCount > 0 && <span className="pk-badge">{unreadCount}</span>}
          </button>
        </nav>

        <div className="pk-sync-status">
          <Icon name="Cloud" size={13} />
          <span>Синхронизировано</span>
        </div>
      </aside>

      {/* ── Main ────────────────────────────────── */}
      <main className="plannerka-main">

        {/* ── CALENDAR VIEW ── */}
        {view === "calendar" && (
          <div className="pk-calendar-view">
            <div className="pk-month-header">
              <div className="pk-month-nav">
                <button className="pk-icon-btn"><Icon name="ChevronLeft" size={15} /></button>
                <h1 className="pk-month-title">{MONTHS_RU[3]} 2026</h1>
                <button className="pk-icon-btn"><Icon name="ChevronRight" size={15} /></button>
              </div>
              <button className="pk-add-btn" onClick={() => setShowAddEvent(true)}>
                <Icon name="Plus" size={15} />
                Событие
              </button>
            </div>

            <div className="pk-cal-grid">
              {DAYS_RU.map((d) => (
                <div key={d} className="pk-cal-dayname">{d}</div>
              ))}
              {Array.from({ length: APRIL_OFFSET }).map((_, i) => (
                <div key={`gap-${i}`} />
              ))}
              {Array.from({ length: APRIL_DAYS }).map((_, i) => {
                const day = i + 1;
                const hasEvents = events.some((e) => e.day === day);
                return (
                  <button
                    key={day}
                    className={`pk-cal-day ${selectedDay === day ? "pk-cal-selected" : ""} ${day === 21 ? "pk-cal-today" : ""}`}
                    onClick={() => setSelectedDay(day)}
                  >
                    <span>{day}</span>
                    {hasEvents && <div className="pk-dot" />}
                  </button>
                );
              })}
            </div>

            {/* Day panel */}
            <div className="pk-day-panel">
              <div className="pk-day-panel-header">
                <h2 className="pk-day-title">
                  {selectedDay} {MONTHS_RU[3]}
                </h2>
                {!showAddEvent && (
                  <button className="pk-text-btn" onClick={() => setShowAddEvent(true)}>
                    + добавить
                  </button>
                )}
              </div>

              {dayEvents.length === 0 && !showAddEvent && (
                <p className="pk-empty">Нет событий</p>
              )}

              <div className="pk-events-list">
                {dayEvents.map((ev) => (
                  <div key={ev.id} className="pk-event-row">
                    <div
                      className="pk-event-line"
                      style={{ backgroundColor: typeColors[ev.type] }}
                    />
                    <div className="pk-event-body">
                      <span className="pk-event-title">{ev.title}</span>
                    </div>
                    <span className="pk-event-time">{ev.time}</span>
                  </div>
                ))}
              </div>

              {showAddEvent && (
                <div className="pk-add-form">
                  <input
                    className="pk-input"
                    placeholder="Название события..."
                    value={newEventTitle}
                    onChange={(e) => setNewEventTitle(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addEvent()}
                    autoFocus
                  />
                  <input
                    type="time"
                    className="pk-input pk-time"
                    value={newEventTime}
                    onChange={(e) => setNewEventTime(e.target.value)}
                  />
                  <div className="pk-form-actions">
                    <button className="pk-btn-cancel" onClick={() => setShowAddEvent(false)}>
                      Отмена
                    </button>
                    <button className="pk-btn-save" onClick={addEvent}>
                      Сохранить
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── NOTIFICATIONS VIEW ── */}
        {view === "notifications" && (
          <div className="pk-notif-view">
            <div className="pk-notif-header">
              <h1 className="pk-page-title">Уведомления</h1>
              {unreadCount > 0 && (
                <button className="pk-text-btn" onClick={markAllRead}>
                  Прочитать все
                </button>
              )}
            </div>

            <div className="pk-notif-list">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={`pk-notif-item ${!n.read ? "pk-unread" : ""}`}
                  onClick={() =>
                    setNotifications((prev) =>
                      prev.map((x) => (x.id === n.id ? { ...x, read: true } : x))
                    )
                  }
                >
                  <div className={`pk-notif-icon pk-notif-${n.type}`}>
                    <Icon name={notifIcons[n.type]} size={13} fallback="Bell" />
                  </div>
                  <div className="pk-notif-body">
                    <p className="pk-notif-text">{n.text}</p>
                    <span className="pk-notif-time">{n.time}</span>
                  </div>
                  {!n.read && <div className="pk-unread-dot" />}
                </div>
              ))}
            </div>

            <div className="pk-sync-panel">
              <div className="pk-sync-icon">
                <Icon name="RefreshCw" size={15} />
              </div>
              <div className="pk-sync-info">
                <p className="pk-sync-title">Облачная синхронизация</p>
                <p className="pk-sync-sub">
                  Обновляется автоматически на всех устройствах
                </p>
              </div>
              <span className="pk-sync-badge">Активна</span>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
