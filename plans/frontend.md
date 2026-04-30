# Frontend Development Plan

**Project:** `iot-monitoring-frontend`
**Stack:** React 19, TypeScript 6, Vite 8
**Current state:** Clean Vite template — no business logic implemented yet.

---

## Goals

Build a dashboard SPA for IoT device monitoring:

- View connected devices and their status
- Display real-time and historical telemetry data
- Manage tenants and users (admin views)
- Authenticate via JWT

---

## Phase 1 — Foundation

Install core dependencies and wire up the project skeleton.

### 1.1 Routing

```bash
npm install react-router-dom
```

Page structure:

```
/                  → redirect to /dashboard
/login             → LoginPage
/dashboard         → DashboardPage
/devices           → DevicesPage
/devices/:id       → DeviceDetailPage
/telemetry         → TelemetryPage
/settings          → SettingsPage (users, tenants)
```

### 1.2 HTTP Client & API Layer

```bash
npm install axios
```

Create `src/api/`:

```
src/api/
├── client.ts          # axios instance, base URL, auth interceptor
├── auth.ts            # login, logout, refresh
├── devices.ts         # CRUD for devices
├── telemetry.ts       # query telemetry data
└── users.ts           # users and tenants
```

Base URL points to the backend API (`http://localhost:5000` by default). Store in `.env.local`:

```
VITE_API_BASE_URL=http://localhost:5000
```

### 1.3 Auth State

```bash
npm install zustand
```

`src/store/authStore.ts` — holds `accessToken`, `user`, `login()`, `logout()`.

JWT stored in memory (not localStorage) for XSS safety; refresh token in an HttpOnly cookie handled by the backend.

Protect routes with a `<RequireAuth>` wrapper component.

### 1.4 Project Structure

```
src/
├── api/               # API client modules
├── assets/            # static assets
├── components/        # shared UI components
│   ├── Layout/
│   ├── Sidebar/
│   └── ...
├── hooks/             # custom React hooks
├── pages/             # one folder per route
│   ├── Login/
│   ├── Dashboard/
│   ├── Devices/
│   ├── DeviceDetail/
│   ├── Telemetry/
│   └── Settings/
├── store/             # Zustand stores
├── types/             # shared TypeScript types (DTOs)
├── utils/             # pure helpers
├── App.tsx
└── main.tsx
```

---

## Phase 2 — Core UI

### 2.1 Component Library

```bash
npm install @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-toast
npm install clsx tailwind-merge
```

Or consider a full component library (shadcn/ui on top of Tailwind). Decision point: evaluate team preference before starting.

### 2.2 Styling

Add Tailwind CSS:

```bash
npm install -D tailwindcss @tailwindcss/vite
```

Configure `vite.config.ts` to use the Tailwind Vite plugin. Replace `index.css` content with Tailwind directives.

### 2.3 Layout

`components/Layout/Layout.tsx` — top navigation bar + collapsible sidebar + main content area. Persistent across all authenticated routes.

### 2.4 Dashboard Page

- Summary cards: total devices, online/offline count, active alerts
- Recent telemetry sparkline chart per device

### 2.5 Devices Page

- Table with columns: name, type, status, last seen, tenant
- Inline status badge (online / offline / error)
- Filter by status and tenant
- Link to DeviceDetailPage

### 2.6 Device Detail Page

- Device metadata
- Real-time telemetry feed (polling or WebSocket)
- Historical telemetry chart (time range picker)

### 2.7 Telemetry Page

- Query telemetry across devices
- Time range filter
- Line chart with multi-device overlay

---

## Phase 3 — Charts & Real-time

### 3.1 Charting Library

```bash
npm install recharts
```

Shared `<TelemetryChart>` component accepting a time-series data array.

### 3.2 Real-time Updates

Option A — polling: `useInterval` hook calling the telemetry API every 5 s.
Option B — WebSocket: connect once in a context provider, fan out data via Zustand.

Start with polling (simpler), migrate to WebSocket when the backend exposes it.

### Phase 3 — Charts & Real-time (выполнено 2026-04-30)

- [x] **3.1 Charting Library** — установлен `recharts`; создан `components/TelemetryChart.tsx` — универсальный компонент с поддержкой multi-series overlay и режима `sparkline` (без осей/сетки)
- [x] **3.2 Real-time Updates (polling)** — DeviceDetailPage: real-time chart с переключением метрик (tabs), polling каждые 5 сек, последние 60 точек на графике
- [x] **TelemetryPage chart** — после нажатия Query отображается линейный chart с multi-device overlay (каждое устройство — отдельная линия)
- [x] **Dashboard sparklines** — в списке Recent devices для каждого устройства показан мини-sparkline последней метрики (20 точек, без осей)

---

## Phase 4 — Settings & Admin

- User list with role badges (admin / operator / viewer)
- Create / edit / deactivate user modal
- Tenant list and management

---

## Phase 5 — Quality & Polish

- Loading skeletons for all async data
- Empty states with actionable prompts
- Error boundaries per page
- Toast notifications for mutations (create, delete, error)
- Responsive layout (tablet + desktop)
- Accessibility: keyboard navigation, ARIA labels on interactive elements

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `VITE_API_BASE_URL` | `http://localhost:5000` | Backend API base URL |
| `VITE_WS_URL` | `ws://localhost:5000` | WebSocket URL (Phase 3) |

---

## Key Decisions (TBD)

| Topic | Options | Notes |
|---|---|---|
| Component library | shadcn/ui, Ant Design, MUI, Radix only | shadcn/ui preferred for minimal bundle |
| State management | Zustand, React Query + Zustand | React Query for server state reduces boilerplate |
| Real-time | Polling, WebSocket, SSE | Depends on backend support |
| Auth token storage | Memory + HttpOnly cookie | Avoid localStorage for access tokens |

---

## Выполненные пункты

### Phase 1 — Foundation (выполнено 2026-04-30)

- [x] **1.1 Routing** — установлен `react-router-dom`, настроены все маршруты (`/`, `/login`, `/dashboard`, `/devices`, `/devices/:id`, `/telemetry`, `/settings`), реализован `<RequireAuth>` wrapper
- [x] **1.2 HTTP Client & API Layer** — установлен `axios`, создан `src/api/` с модулями `client.ts` (axios instance, auth interceptor, refresh логика), `auth.ts`, `devices.ts`, `telemetry.ts`, `users.ts`
- [x] **1.3 Auth State** — установлен `zustand`, создан `src/store/authStore.ts` с `accessToken` в памяти (не localStorage), `user`, `login()`, `logout()`, `setAccessToken()`
- [x] **1.4 Project Structure** — создана полная структура `src/`: `api/`, `components/Layout/`, `components/Sidebar/`, `hooks/`, `pages/` (6 страниц-заглушек), `store/`, `types/`, `utils/`
- [x] **`.env.local`** — создан с `VITE_API_BASE_URL` и `VITE_WS_URL`

### Phase 2 — Core UI (выполнено 2026-04-30)

- [x] **2.1 Component Library** — установлены `@radix-ui/react-dialog`, `@radix-ui/react-dropdown-menu`, `@radix-ui/react-toast`, `@radix-ui/react-tooltip`, `@radix-ui/react-separator`, `clsx`, `tailwind-merge`, `lucide-react`
- [x] **2.2 Styling** — установлен `tailwindcss @tailwindcss/vite`; `vite.config.ts` обновлён с Tailwind Vite плагином; `index.css` заменён на Tailwind directives с кастомными CSS токенами
- [x] **2.3 Layout** — `components/Layout/Layout.tsx`: top navbar (уведомления, имя пользователя, logout) + collapsible sidebar (`components/Sidebar/Sidebar.tsx` — навигация с иконками lucide-react, кнопка сворачивания) + main content area; `<RequireAuth>` в `App.tsx` теперь оборачивает Layout
- [x] **2.4 Dashboard Page** — 4 stat-cards (всего устройств, online, offline, error), таблица "Recent devices" с `StatusBadge`, loading state, ссылка на DevicesPage
- [x] **2.5 Devices Page** — таблица (name, type, status, last seen) с `StatusBadge`, фильтр по статусу (tabs), поиск по названию/типу
- [x] **2.6 Device Detail Page** — метаданные устройства (id, tenant, last seen), realtime telemetry feed с авто-polling каждые 5 сек, кнопка ручного обновления, таблица последних 20 записей
- [x] **2.7 Telemetry Page** — query bar (выбор устройства, фильтр метрики, time-range tabs: 1h/6h/24h/7d), таблица результатов с именем устройства
- [x] **Shared components** — `components/StatusBadge.tsx` (online/offline/error), `components/StatCard.tsx`, `utils/cn.ts` (clsx + tailwind-merge)
