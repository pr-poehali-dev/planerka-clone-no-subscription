import { useState, useEffect, useCallback } from "react";
import Icon from "@/components/ui/icon";

const API_REGISTER = "https://functions.poehali.dev/95e65f9d-bb83-4561-9888-7ab6b6ad435c";
const API_ME = "https://functions.poehali.dev/115f7ac0-5cd2-4e2f-92f8-8d0e4500ce27";
const API_EVENTS = "https://functions.poehali.dev/20983092-967b-47ac-93ec-9047721931e6";

type View = "calendar" | "notifications";

interface CalEvent {
  id: string | number;
  title: string;
  time: string;
  type: "meeting" | "task" | "reminder";
  day: number;
  month?: number;
  year?: number;
}

interface Notification {
  id: string;
  text: string;
  time: string;
  read: boolean;
  type: "sync" | "reminder" | "update";
}

interface User {
  id: number;
  fio: string;
  phone: string;
}

const DAYS_RU = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const MONTHS_RU = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
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

const APRIL_OFFSET = 2;
const APRIL_DAYS = 30;

function formatPhone(raw: string) {
  const digits = raw.replace(/\D/g, "").slice(0, 11);
  if (!digits) return "";
  let result = "+7";
  if (digits.length > 1) result += " (" + digits.slice(1, 4);
  if (digits.length > 4) result += ") " + digits.slice(4, 7);
  if (digits.length > 7) result += "-" + digits.slice(7, 9);
  if (digits.length > 9) result += "-" + digits.slice(9, 11);
  return result;
}

// ── Auth Screen ─────────────────────────────────
function AuthScreen({ onLogin }: { onLogin: (user: User, sessionId: string) => void }) {
  const [phone, setPhone] = useState("");
  const [fio, setFio] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function handlePhoneInput(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/\D/g, "");
    const clamped = raw.startsWith("8") ? "7" + raw.slice(1) : raw.startsWith("7") ? raw : "7" + raw;
    setPhone(formatPhone(clamped));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(API_REGISTER, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, fio }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Ошибка входа");
      } else {
        localStorage.setItem("session_id", data.session_id);
        onLogin({ id: 0, fio: data.fio, phone }, data.session_id);
      }
    } catch {
      setError("Нет соединения с сервером");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="pk-logo-mark">П</div>
          <span className="pk-logo-name">Планёрка</span>
        </div>

        <div className="auth-heading">
          <h1 className="auth-title">Добро пожаловать</h1>
          <p className="auth-sub">Введите ваши данные для входа или регистрации</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-field">
            <label className="auth-label">Номер телефона</label>
            <div className="auth-input-wrap">
              <Icon name="Phone" size={15} />
              <input
                className="auth-input"
                type="tel"
                placeholder="+7 (999) 000-00-00"
                value={phone}
                onChange={handlePhoneInput}
                required
              />
            </div>
          </div>

          <div className="auth-field">
            <label className="auth-label">ФИО</label>
            <div className="auth-input-wrap">
              <Icon name="User" size={15} />
              <input
                className="auth-input"
                type="text"
                placeholder="Иванов Иван Иванович"
                value={fio}
                onChange={(e) => setFio(e.target.value)}
                required
              />
            </div>
          </div>

          {error && <p className="auth-error">{error}</p>}

          <button className="auth-submit" type="submit" disabled={loading}>
            {loading ? (
              <span className="auth-spinner" />
            ) : (
              <>
                <Icon name="LogIn" size={15} />
                Войти в планировщик
              </>
            )}
          </button>
        </form>

        <p className="auth-hint">
          Если аккаунта нет — он создастся автоматически
        </p>
      </div>
    </div>
  );
}

// ── Main App ─────────────────────────────────────
export default function Index() {
  const [user, setUser] = useState<User | null>(null);
  const [sessionId, setSessionId] = useState<string>("");
  const [authChecked, setAuthChecked] = useState(false);

  const [view, setView] = useState<View>("calendar");
  const [selectedDay, setSelectedDay] = useState(21);
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([
    { id: "n1", text: "Добро пожаловать в Планёрку!", time: "Сейчас", read: false, type: "update" },
  ]);
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newTime, setNewTime] = useState("10:00");
  const [saving, setSaving] = useState(false);

  // Восстановить сессию
  useEffect(() => {
    const sid = localStorage.getItem("session_id");
    if (!sid) { setAuthChecked(true); return; }
    fetch(API_ME, { headers: { "X-Session-Id": sid } })
      .then((r) => r.json())
      .then((data) => {
        if (data.id) { setUser(data); setSessionId(sid); }
        else { localStorage.removeItem("session_id"); }
      })
      .catch(() => {})
      .finally(() => setAuthChecked(false));
    setAuthChecked(true);
  }, []);

  // Загрузить события
  const loadEvents = useCallback((sid: string) => {
    setEventsLoading(true);
    fetch(API_EVENTS, { headers: { "X-Session-Id": sid } })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setEvents(data.map((e: CalEvent) => ({ ...e, id: String(e.id) })));
      })
      .catch(() => {})
      .finally(() => setEventsLoading(false));
  }, []);

  useEffect(() => {
    if (sessionId) loadEvents(sessionId);
  }, [sessionId, loadEvents]);

  function handleLogin(u: User, sid: string) {
    setUser(u);
    setSessionId(sid);
    setNotifications((prev) => [
      { id: Date.now().toString(), text: `Вошли как ${u.fio}`, time: "Только что", read: false, type: "sync" },
      ...prev,
    ]);
  }

  function handleLogout() {
    localStorage.removeItem("session_id");
    setUser(null);
    setSessionId("");
    setEvents([]);
  }

  async function addEvent() {
    if (!newTitle.trim() || !sessionId) return;
    setSaving(true);
    try {
      const res = await fetch(API_EVENTS, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Session-Id": sessionId },
        body: JSON.stringify({ title: newTitle, time: newTime, day: selectedDay, month: 4, year: 2026, type: "task" }),
      });
      const ev = await res.json();
      if (res.ok) {
        setEvents((prev) => [...prev, { ...ev, id: String(ev.id) }]);
        setNotifications((prev) => [
          { id: Date.now().toString(), text: `Добавлено: «${newTitle}» — синхронизировано`, time: "Только что", read: false, type: "sync" },
          ...prev,
        ]);
        setNewTitle("");
        setNewTime("10:00");
        setShowAddEvent(false);
      }
    } finally {
      setSaving(false);
    }
  }

  if (!authChecked && !user) return null;
  if (!user) return <AuthScreen onLogin={handleLogin} />;

  const dayEvents = events.filter((e) => e.day === selectedDay && (e.month === 4 || e.month === undefined));
  const unreadCount = notifications.filter((n) => !n.read).length;
  const firstName = user.fio.split(" ")[1] || user.fio.split(" ")[0] || "Пользователь";

  return (
    <div className="plannerka-shell">
      {/* Sidebar */}
      <aside className="plannerka-sidebar">
        <div className="pk-logo">
          <div className="pk-logo-mark">П</div>
          <span className="pk-logo-name">Планёрка</span>
        </div>

        <nav className="pk-nav">
          <button className={`pk-nav-item ${view === "calendar" ? "pk-active" : ""}`} onClick={() => setView("calendar")}>
            <Icon name="CalendarDays" size={18} />
            <span>Календарь</span>
          </button>
          <button className={`pk-nav-item ${view === "notifications" ? "pk-active" : ""}`} onClick={() => setView("notifications")}>
            <Icon name="Bell" size={18} />
            <span>Уведомления</span>
            {unreadCount > 0 && <span className="pk-badge">{unreadCount}</span>}
          </button>
        </nav>

        <div className="pk-user-block">
          <div className="pk-user-info">
            <div className="pk-user-avatar">{firstName[0]}</div>
            <div className="pk-user-details">
              <span className="pk-user-name">{firstName}</span>
              <span className="pk-user-phone">{user.phone}</span>
            </div>
          </div>
          <button className="pk-logout-btn" onClick={handleLogout} title="Выйти">
            <Icon name="LogOut" size={14} />
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="plannerka-main">
        {/* CALENDAR */}
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
              {DAYS_RU.map((d) => <div key={d} className="pk-cal-dayname">{d}</div>)}
              {Array.from({ length: APRIL_OFFSET }).map((_, i) => <div key={`g${i}`} />)}
              {Array.from({ length: APRIL_DAYS }).map((_, i) => {
                const day = i + 1;
                const hasEvents = events.some((e) => e.day === day && (e.month === 4 || e.month === undefined));
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

            <div className="pk-day-panel">
              <div className="pk-day-panel-header">
                <h2 className="pk-day-title">{selectedDay} {MONTHS_RU[3]}</h2>
                {!showAddEvent && (
                  <button className="pk-text-btn" onClick={() => setShowAddEvent(true)}>+ добавить</button>
                )}
              </div>

              {eventsLoading && <p className="pk-empty">Загрузка...</p>}
              {!eventsLoading && dayEvents.length === 0 && !showAddEvent && (
                <p className="pk-empty">Нет событий</p>
              )}

              <div className="pk-events-list">
                {dayEvents.map((ev) => (
                  <div key={ev.id} className="pk-event-row">
                    <div className="pk-event-line" style={{ backgroundColor: typeColors[ev.type] || "#888" }} />
                    <div className="pk-event-body"><span className="pk-event-title">{ev.title}</span></div>
                    <span className="pk-event-time">{ev.time}</span>
                  </div>
                ))}
              </div>

              {showAddEvent && (
                <div className="pk-add-form">
                  <input
                    className="pk-input"
                    placeholder="Название события..."
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addEvent()}
                    autoFocus
                  />
                  <input
                    type="time"
                    className="pk-input pk-time"
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                  />
                  <div className="pk-form-actions">
                    <button className="pk-btn-cancel" onClick={() => setShowAddEvent(false)}>Отмена</button>
                    <button className="pk-btn-save" onClick={addEvent} disabled={saving}>
                      {saving ? "Сохраняю..." : "Сохранить"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* NOTIFICATIONS */}
        {view === "notifications" && (
          <div className="pk-notif-view">
            <div className="pk-notif-header">
              <h1 className="pk-page-title">Уведомления</h1>
              {unreadCount > 0 && (
                <button className="pk-text-btn" onClick={() => setNotifications((p) => p.map((n) => ({ ...n, read: true })))}>
                  Прочитать все
                </button>
              )}
            </div>

            <div className="pk-notif-list">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={`pk-notif-item ${!n.read ? "pk-unread" : ""}`}
                  onClick={() => setNotifications((p) => p.map((x) => x.id === n.id ? { ...x, read: true } : x))}
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
              <div className="pk-sync-icon"><Icon name="RefreshCw" size={15} /></div>
              <div className="pk-sync-info">
                <p className="pk-sync-title">Облачная синхронизация</p>
                <p className="pk-sync-sub">Обновляется автоматически на всех устройствах</p>
              </div>
              <span className="pk-sync-badge">Активна</span>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
