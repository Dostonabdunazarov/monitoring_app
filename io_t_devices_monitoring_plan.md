# Система мониторинга IoT-устройств — План

## 1. Обзор

Платформа мониторинга IoT-устройств для сбора, обработки, хранения и визуализации телеметрических данных в реальном времени.

**Целевой масштаб MVP:** 100–500 устройств. Мультитенантная архитектура (несколько клиентов/организаций) — `tenant_id` присутствует во всех ключевых таблицах с самого начала.

---

## 2. Высокоуровневая архитектура

```
[ IoT-устройства ]
        |
   (MQTT / HTTP)
        |
   [ Слой приёма данных ]
        |
   [ Брокер сообщений (Kafka) ]
        |
   +------------------------+
   |                        |
[ Потоковая обработка ] [ Сервис записи в хранилище ]
   |                        |
[ Оповещения / Правила ] [ PostgreSQL / TSDB ]
   |                        |
   +-----------+------------+
               |
         [ Backend API ]
               |
         [ Frontend UI ]
```

---

## 3. Компоненты

> **Количество API-сервисов**: один ASP.NET Core проект с двумя группами endpoints — `/ingest/*` (приём от устройств, device-token) и `/api/*` (пользовательский API, JWT). Это разделы 3.1 и 3.5 ниже. Код структурирован модульно (`IoT.Ingest`, `IoT.Api`, `IoT.Shared`), чтобы при росте нагрузки разделение на два независимых host-а стоило дёшево. Расщепление — часть Этапа 5, только при реальной необходимости.

### 3.1 Слой приёма данных (`/ingest/*`)
- ASP.NET Core Web API (часть общего API-проекта, модуль `IoT.Ingest`)
- Протоколы: HTTP (MVP), MQTT (позже)
- Аутентификация устройств по Bearer-токену
- **Идемпотентность**: каждое сообщение несёт `message_id` (UUID), дубликаты отбрасываются на стороне consumer'а
- **Формат сообщений**: JSON (для MVP). Переход на Protobuf + Schema Registry — на Этапе 5
- **Rate limiting** на `/ingest` (per-token) — защита от скомпрометированного устройства
- **Backpressure**: если Kafka недоступна — API возвращает `503`, устройство ретраит. Локальный буфер на диске для MVP не используем (избыточная сложность)

### 3.2 Брокер сообщений — Kafka
- Событийная шина между приёмом и обработкой
- Ключ партиционирования: `device_id` (гарантирует порядок сообщений для одного устройства)
- Топики:
  - `telemetry.raw` — входящие сообщения
  - `alerts.triggered` — сработавшие оповещения
- Для 100–500 устройств достаточно 3 партиций на топик. Масштабируется увеличением числа партиций
- Партиции добавляем вручную по мере необходимости

### 3.3 Потоковая обработка
- .NET Worker Services + Kafka Consumers
- Зоны ответственности:
  - Валидация и фильтрация
  - Запись в БД (consumer #1) с дедупликацией по `message_id`
  - Агрегация
  - Обнаружение аномалий
  - Срабатывание оповещений (consumer #2)

### 3.4 Слой хранения
- PostgreSQL
- TimescaleDB для таблицы `telemetry` (hypertable по `timestamp`)

### 3.5 Backend API (`/api/*`)
- ASP.NET Core Web API (часть общего API-проекта, модуль `IoT.Api`)
- JWT-аутентификация пользователей
- Все запросы автоматически фильтруются по `tenant_id` из JWT (защита от horizontal access)
- SignalR hub (`/hubs/telemetry`) — пуш обновлений в React-клиент

### 3.6 Frontend
- **React (SPA)** — Vite + TypeScript
- Маршрутизация: React Router
- Состояние: TanStack Query (server state) + Zustand или Context (UI state)
- UI-библиотека: MUI / Ant Design / shadcn-ui (выбрать на Этапе 3)
- Графики: Recharts или ECharts
- Обновления в реальном времени через SignalR (`@microsoft/signalr`)

### 3.7 Система оповещений
- Движок правил (rules engine), правила хранятся в БД в таблице `alert_rules`
- Примеры условий:
  - Превышен температурный порог
  - Устройство офлайн (см. «Открытые вопросы»)
  - Аномалия в payload

---

## 4. Архитектурный стиль

- Событийно-ориентированная архитектура
- Модульный монолит (MVP)
- Микросервисы — путь развития при росте нагрузки

---

## 5. Схема базы данных

### Арендаторы
```
tenants
- id (uuid, PK)
- name
- created_at
```

### Пользователи
```
users
- id (uuid, PK)
- tenant_id (uuid, FK -> tenants, NOT NULL)
- email (unique)
- password_hash
- role (admin | user)
- created_at
```

### Устройства
```
devices
- id (uuid, PK)
- tenant_id (uuid, FK -> tenants, NOT NULL)
- name
- type
- status
- created_at

Индексы:
- (tenant_id, id)
- (tenant_id, status)
```

### Токены устройств
```
device_tokens
- id (uuid, PK)
- device_id (uuid, FK -> devices)
- token_hash
- created_at
- revoked_at (nullable)
```

### Телеметрия (TimescaleDB hypertable)
```
telemetry
- device_id  (uuid, NOT NULL)
- tenant_id  (uuid, NOT NULL)       -- денормализация для быстрых выборок per-tenant
- timestamp  (timestamptz, NOT NULL)
- message_id (uuid, NOT NULL)       -- для дедупликации
- temperature (double precision, nullable)
- humidity    (double precision, nullable)
- payload     (jsonb)

PRIMARY KEY (device_id, timestamp, message_id)
Hypertable по timestamp (chunk_time_interval = 1 day)

Индексы:
- (tenant_id, timestamp DESC)
- (device_id, timestamp DESC)
```

### Правила оповещений
```
alert_rules
- id (uuid, PK)
- tenant_id (uuid, FK -> tenants, NOT NULL)
- device_id (uuid, FK -> devices, nullable)  -- null = для всех устройств арендатора
- condition (jsonb)   -- пример: {"field": "temperature", "op": ">", "value": 80}
- enabled (bool)
- created_at
```

### Оповещения
```
alerts
- id (uuid, PK)
- tenant_id (uuid, FK -> tenants, NOT NULL)
- device_id (uuid, FK -> devices)
- rule_id (uuid, FK -> alert_rules, nullable)
- type
- message
- created_at
- resolved (bool, default false)
- resolved_at (nullable)

Индексы:
- (tenant_id, created_at DESC)
- (tenant_id, resolved) WHERE resolved = false
- (device_id, created_at DESC)
```

### Статус устройств
Таблица `device_status` будет добавлена, когда определимся с механизмом offline-detection (см. «Открытые вопросы»). На Этапе 4.

---

## 6. Поток данных

1. Устройство отправляет телеметрию с Bearer-токеном (HTTP POST `/ingest`)
2. API валидирует токен, подставляет `tenant_id`, публикует сообщение в Kafka-топик `telemetry.raw` с ключом `device_id`
3. Kafka распределяет события:
   - Consumer #1 (storage) → проверяет `message_id` на дубликат → пишет в `telemetry`
   - Consumer #2 (alerts) → сверяет с `alert_rules` → пишет в `alerts` → публикует в `alerts.triggered`
4. Backend API отдаёт данные пользователям, фильтруя по `tenant_id` из JWT
5. SignalR пушит обновления в UI (новая телеметрия + новые оповещения)

---

## 7. Дорожная карта MVP

### Этап 1 — Базовый приём и хранение
- Структура solution, docker-compose с Postgres+TimescaleDB
- Миграции: `tenants`, `users`, `devices`, `device_tokens`, `telemetry`
- JWT-аутентификация пользователей, регистрация
- Endpoint `/ingest` с токеном устройства → запись напрямую в БД (Kafka ещё нет)
- Админ-эндпоинты: создание устройств, выпуск токенов
- **DoD**: устройство может отправить POST → данные видны в БД → пользователь своего арендатора видит их через GET, чужого — нет

### Этап 2 — Kafka и воркеры
- Kafka в docker-compose (KRaft или с Zookeeper)
- Endpoint `/ingest` переключается: пишет в Kafka вместо БД
- Worker #1 (storage): consumer читает `telemetry.raw` → пишет в БД с дедупликацией по `message_id`
- **DoD**: путь «устройство → API → Kafka → worker → БД» работает end-to-end, дубликаты не попадают в БД

### Этап 3 — Реальное время и дашборд
- SignalR hub на backend
- React SPA (Vite + TypeScript), страницы: логин, список устройств, детальная страница устройства с графиком
- Подписка на SignalR на клиенте через `@microsoft/signalr`
- Выбор UI-библиотеки (MUI / Ant Design / shadcn-ui)
- **DoD**: новая телеметрия появляется в UI без перезагрузки страницы

### Этап 4 — Оповещения
- Схемы `alert_rules`, `alerts`
- Worker #2 (alerts): consumer правил
- **Выбрать механизм offline-detection** (см. «Открытые вопросы»)
- UI: лента оповещений, CRUD правил
- **DoD**: правило срабатывает → запись в `alerts` → пуш в UI

### Этап 5 — Масштаб и качество
Каждое — независимый мини-эпик, делается по необходимости:
- Увеличение партиций Kafka
- Интеграция MQTT
- Redis-кэш (для 100–500 устройств обычно избыточно)
- Переход на Protobuf + Schema Registry
- mTLS для устройств
- **Расщепление API на два host-а** (`IoT.Ingest` и `IoT.Api` как отдельные деплойменты) — только при реальной необходимости: изоляция отказов, разный scaling-профиль, разные security-профили

---

## 8. Стратегия масштабирования

Для 100–500 устройств большинство оптимизаций **избыточны**. Список ниже — что применять, если нагрузка реально вырастет:

- Больше партиций Kafka (ключ — `device_id`)
- Горизонтальное масштабирование consumer group
- TimescaleDB: retention policy, continuous aggregates, compression старых chunk'ов
- Redis-кэш для частых запросов («последние значения по устройству»)
- Реплики Postgres для read-нагрузки

---

## 9. Безопасность

### Пользователи
- JWT-аутентификация
- Пароли — argon2 или bcrypt
- Все запросы фильтруются по `tenant_id` из JWT (защита от horizontal access)

### Устройства
- Bearer-токен per-устройство (в БД хранится только хэш в `device_tokens`)
- **Provisioning (MVP)**: администратор создаёт устройство в UI → получает токен → вручную прошивает в устройство
- **Provisioning (target state)**: mTLS-сертификаты + bootstrap endpoint с одноразовым кодом
- Ротация: `revoked_at` позволяет отозвать токен, выпустить новый

### Транспорт
- HTTPS обязателен
- TLS для MQTT (когда появится)
- Rate limiting на `/ingest` (per-token)

---

## 10. Наблюдаемость

Система мониторинга сама должна быть под мониторингом.

- **Логирование**: Serilog + структурированные JSON-логи, корреляционный `trace_id` сквозь API → Kafka → worker
- **Метрики** (OpenTelemetry / Prometheus):
  - Latency приёма телеметрии
  - Consumer lag по топикам
  - Сообщений/сек per-топик
  - Счётчики ошибок валидации и дубликатов
- **Distributed tracing**: OpenTelemetry, backend — Jaeger или Tempo
- **Health checks**: `/health/live` и `/health/ready` для API и каждого worker
- **Dashboards**: Grafana — базовый набор подключаем с первых этапов

---

## 11. Тестирование и деплой

### Локальная разработка
- `docker-compose.yml`: Postgres+TimescaleDB, Kafka, Grafana, Prometheus

### Тестирование
- Unit-тесты: xUnit
- Интеграционные тесты consumers: **Testcontainers** (реальные Postgres + Kafka, не моки)
- API-тесты: `WebApplicationFactory`

### Миграции БД
- EF Core Migrations либо FluentMigrator
- Применяются отдельным шагом при деплое (не на старте приложения)

### CI/CD (на будущее)
- GitHub Actions / GitLab CI
- Build → test → образ в Docker registry → деплой

---

## 12. Расширенные возможности (после MVP)

- OTA-обновления прошивок
- Геолокация устройств
- Историческая аналитика (агрегаты: день/неделя/месяц — continuous aggregates в TimescaleDB)
- ML-детекция аномалий

---

## 13. Распространённые ошибки, которых стоит избегать

- Запись в БД напрямую с устройств (минуя API)
- Пропуск слоя брокера сообщений при реальной нагрузке
- Отсутствие стратегии партиционирования
- **Забытый `tenant_id` в запросах** — утечка данных между арендаторами
- Отсутствие дедупликации по `message_id` (при ретраях устройства)
- Моки вместо реальных Postgres/Kafka в интеграционных тестах
- Игнорирование consumer lag в мониторинге

---

## 14. Рекомендуемый стек

- ASP.NET Core (API + Workers)
- Kafka
- PostgreSQL + TimescaleDB
- SignalR
- **React + Vite + TypeScript** (TanStack Query, React Router, Recharts)
- Serilog, OpenTelemetry, Prometheus, Grafana
- Testcontainers для интеграционных тестов

---

## 15. Открытые вопросы (решить по ходу)

- **Offline-detection** — выбрать механизм в начале Этапа 4. Варианты:
  - Периодический sweep по `last_seen` из `telemetry` (самый простой, задержка до N секунд)
  - Redis с TTL + heartbeat (быстрее и точнее, +зависимость)
  - Таймер внутри Kafka consumer
- **UI-библиотека для React**: MUI vs Ant Design vs shadcn-ui — к Этапу 3
- **Формат payload**: JSON сейчас → Protobuf + Schema Registry к Этапу 5
- **MQTT-брокер**: EMQX / Mosquitto / HiveMQ — когда дойдём до интеграции

---

## 16. Следующие шаги

1. Создать структуру .NET solution:
   - `IoT.Api.Host` — единственный ASP.NET Core host, собирает и `/ingest/*`, и `/api/*`
   - `IoT.Ingest` — модуль приёма от устройств (device-token auth)
   - `IoT.Api` — модуль пользовательского API (JWT auth) + SignalR hub
   - `IoT.Workers` — worker-сервисы (consumer'ы Kafka) — отдельный host
   - `IoT.Domain` — сущности и бизнес-логика
   - `IoT.Infrastructure` — доступ к БД, Kafka, внешним сервисам
   - `IoT.Shared` — общие контракты и утилиты
2. Поднять `docker-compose.yml` с Postgres+TimescaleDB
3. Миграции: `tenants`, `users`, `devices`, `device_tokens`, `telemetry`
4. JWT-аутентификация пользователей + регистрация
5. Endpoint `/ingest` с токеном устройства → прямая запись в БД (без Kafka)
6. Admin-эндпоинты: создание устройства, выпуск токена
7. Переход на Этап 2: добавить Kafka между API и записью в БД

---

Конец плана
