# MVP IoT Monitoring App Flow

## 1. What The MVP Does

The MVP is a multi-tenant IoT monitoring platform.

Each client organization gets its own:

- `tenant`
- users
- devices
- device tokens
- telemetry data

The main idea is:

1. An admin registers in the system.
2. The system creates a tenant and the first admin user.
3. The admin creates devices and issues device tokens.
4. Devices send telemetry to the backend.
5. The backend validates the device token, attaches `tenant_id` and `device_id`, and stores telemetry.
6. Users log in with JWT and see only their own tenant's devices and telemetry.

At the first MVP stage, ingestion writes directly to PostgreSQL/TimescaleDB.

At the next stage, ingestion goes through Kafka and workers.

## 2. End-To-End Picture

Early MVP:

```text
device -> /ingest -> API -> PostgreSQL/TimescaleDB -> /api/* -> UI
```

After Kafka is introduced:

```text
device -> /ingest -> API -> Kafka -> worker -> PostgreSQL/TimescaleDB -> /api/* -> UI
```

Later:

```text
new telemetry -> SignalR -> UI update without refresh
alerts worker -> alerts table -> SignalR -> UI alert feed
```

## 3. How Data Comes From Devices

For MVP, devices send data over HTTP.

MQTT exists in the plan, but not in the first version.

The payload format is JSON.

Each device authenticates with its own Bearer token.

That token is not a user token. It is a device token issued by the platform and stored in the database as a hash in `device_tokens`.

Each telemetry message should include:

- `message_id` as UUID
- `timestamp`
- telemetry fields such as `temperature` and `humidity`
- optional raw `payload`

Example:

```json
{
  "message_id": "8b5c5dd4-8c61-4baf-b2b8-4bf9a45f1e8f",
  "timestamp": "2026-04-26T15:00:00Z",
  "temperature": 24.7,
  "humidity": 50.1,
  "payload": {
    "battery": 91,
    "signal": -68
  }
}
```

Why `message_id` matters:

- it gives idempotency
- if a device retries the same message, duplicates can be detected and ignored

## 4. Where Data Is Stored

Main storage is PostgreSQL with TimescaleDB.

Core tables:

- `tenants`
- `users`
- `devices`
- `device_tokens`
- `telemetry`
- later: `alert_rules`
- later: `alerts`

The `telemetry` table is a TimescaleDB hypertable partitioned by `timestamp`.

Telemetry stores:

- `device_id`
- `tenant_id`
- `timestamp`
- `message_id`
- `temperature`
- `humidity`
- `payload`

Important detail:

`tenant_id` is stored directly in telemetry so reads per tenant are fast and safe.

## 5. How The MVP Works In Stage 1

At stage 1 there is no Kafka yet.

The simplest working flow is:

1. The device sends `POST /ingest`.
2. The backend validates the device token.
3. The backend resolves `device_id` and `tenant_id`.
4. The backend validates the JSON payload.
5. The backend writes the record directly into `telemetry`.

This first version is important because it gives a full working vertical slice quickly:

- devices can send data
- data is stored in the database
- users can read the data in the UI

## 6. How The System Evolves In Stage 2

After stage 1, ingestion stops writing directly to the database and starts publishing into Kafka.

The new flow becomes:

1. Device sends `POST /ingest`.
2. API validates the device token.
3. API attaches `tenant_id` and `device_id`.
4. API publishes the event to Kafka topic `telemetry.raw`.
5. Kafka distributes messages by key `device_id`.
6. Storage worker consumes `telemetry.raw`.
7. Worker checks `message_id` for duplicates.
8. Worker writes the telemetry into PostgreSQL/TimescaleDB.

Why Kafka is introduced:

- decouples data reception from database writes
- handles bursts better
- makes scaling easier
- allows adding more consumers later

## 7. Why Kafka Uses `device_id` As The Key

Kafka partition key should be `device_id`.

That ensures:

- messages from the same device stay ordered
- processing logic stays predictable
- later aggregations and rules are easier to implement

## 8. How Users Access Data

Users do not access the database directly.

They use `/api/*`.

Flow:

1. A user registers or logs in.
2. The backend issues a JWT.
3. The frontend sends that JWT with every request.
4. The backend extracts `tenant_id` from JWT.
5. Every query is filtered by `tenant_id`.

This prevents data leakage between tenants.

A user from tenant A must never see devices or telemetry from tenant B.

Typical user actions:

- get device list
- open device details
- view telemetry history
- later: see alerts and manage rules

## 9. How The Frontend MVP Looks

The frontend is planned as a React SPA.

Main MVP pages:

- login
- device list
- device details page
- chart for telemetry history

Later pages:

- alerts feed
- alert rules CRUD

Typical user journey:

1. User logs in.
2. User sees all devices belonging to the tenant.
3. User opens a device page.
4. User sees recent and historical telemetry values.

## 10. How Realtime Works Later

Realtime arrives at stage 3 via SignalR.

Before SignalR:

- UI fetches data with normal API calls

After SignalR:

1. New telemetry enters the system.
2. Backend pushes updates through SignalR hub.
3. React client receives the event.
4. Graphs and device cards update without page refresh.

## 11. How Alerts Work Later

Alerts are stage 4.

New database objects:

- `alert_rules`
- `alerts`

Examples of rules:

- `temperature > threshold`
- device offline
- anomaly in payload

Flow:

1. Telemetry enters the system.
2. Alerts worker consumes the stream.
3. Worker checks telemetry against rules.
4. If a rule matches, a record is written into `alerts`.
5. Backend pushes the alert to UI.

So alerts are an automated reaction to telemetry, not a separate manual subsystem.

## 12. Offline Detection

This is still an open design question in the plan.

Possible options:

- periodic sweep using `last_seen`
- Redis TTL plus heartbeat
- timer logic inside Kafka consumer

For MVP, the simplest option is periodic checking:

- look at the last telemetry timestamp for a device
- if too much time passed, mark the device as offline

## 13. Security Model

### User Security

- JWT authentication
- password hash storage
- every request filtered by `tenant_id`

### Device Security

- Bearer token per device
- only token hash stored in DB
- token can be revoked through `revoked_at`

### Transport Security

- HTTPS is mandatory
- rate limiting on `/ingest`
- if Kafka is unavailable later, `/ingest` should return `503`

## 14. Reliability Model

The plan already includes the main reliability concepts:

- `message_id` for deduplication
- `tenant_id` in all important places
- Kafka key = `device_id`
- TimescaleDB hypertable for time-series data
- worker-based async processing
- health checks, metrics, tracing

## 15. Full System Lifecycle

Ideal platform lifecycle:

1. Admin registers.
2. System creates `tenant`.
3. Admin creates a device.
4. System issues a device token.
5. Token is configured in the device.
6. Device sends telemetry.
7. Backend accepts and stores telemetry.
8. User logs in with JWT.
9. UI shows only that tenant's devices and data.
10. Later, SignalR delivers realtime updates.
11. Later, alerts worker creates alerts and pushes them to UI.

## 16. First Truly Useful Business Version

The first useful business MVP is:

- user registration
- JWT login
- device creation
- device token issuance
- `/ingest` telemetry reception
- save telemetry into `telemetry`
- device list in UI
- device details and history in UI

That is already a real working monitoring system.

Then the next useful upgrades are:

- Kafka between ingest and storage
- realtime UI with SignalR
- alert rules and alert feed

## 17. Architecture Diagrams

### 17.1 Stage 1 MVP

```text
                       MVP Stage 1
              (no Kafka, direct DB write)

+------------------+                         +----------------------+
| Admin / User     |                         | IoT Device           |
| React UI         |                         | sensor / controller  |
+---------+--------+                         +----------+-----------+
          |                                              |
          | login/register                               | POST /ingest
          | JWT                                          | Bearer device-token
          v                                              v
+--------------------------------------------------------------------------+
|                         ASP.NET Core API Host                            |
|--------------------------------------------------------------------------|
| /api/auth/*     -> register, login, JWT                                  |
| /api/devices    -> device management                                     |
| /api/telemetry  -> data reads for UI                                     |
| /ingest         -> telemetry ingestion from devices                      |
|                                                                          |
| What /ingest does:                                                       |
| 1. validates device token                                                |
| 2. resolves device_id and tenant_id                                      |
| 3. validates JSON payload                                                |
| 4. writes into telemetry                                                 |
+----------------------------------+---------------------------------------+
                                   |
                                   v
+--------------------------------------------------------------------------+
|                    PostgreSQL + TimescaleDB                              |
|--------------------------------------------------------------------------|
| tenants                                                                  |
| users                                                                    |
| devices                                                                  |
| device_tokens                                                            |
| telemetry (hypertable by timestamp)                                      |
+--------------------------------------------------------------------------+

User flow:
UI -> /api/* -> JWT -> tenant_id filtering -> only own tenant data

Device flow:
Device -> /ingest -> token validation -> device/tenant resolve -> telemetry
```

### 17.2 Stage 2 With Kafka

```text
                       Stage 2
              (proper pipeline through Kafka)

+------------------+                         +----------------------+
| Admin / User     |                         | IoT Device           |
| React UI         |                         | sensor / controller  |
+---------+--------+                         +----------+-----------+
          |                                              |
          | login/register                               | POST /ingest
          | JWT                                          | Bearer device-token
          v                                              v
+--------------------------------------------------------------------------+
|                         ASP.NET Core API Host                            |
|--------------------------------------------------------------------------|
| /api/*     -> user API                                                   |
| /ingest    -> accept + publish only                                      |
|                                                                          |
| What /ingest does:                                                       |
| 1. validates device token                                                |
| 2. resolves tenant_id / device_id                                        |
| 3. forms telemetry.raw event                                             |
| 4. sends it to Kafka                                                     |
+----------------------------------+---------------------------------------+
                                   |
                                   v
+--------------------------------------------------------------------------+
|                                Kafka                                     |
|--------------------------------------------------------------------------|
| topic: telemetry.raw                                                     |
| key: device_id                                                           |
| this keeps message order per device                                      |
+----------------------------------+---------------------------------------+
                                   |
                     +-------------+-------------+
                     |                           |
                     v                           v
         +------------------------+   +------------------------+
         | Worker #1 Storage      |   | Worker #2 Alerts       |
         | consumer telemetry.raw |   | consumer telemetry.raw |
         +-----------+------------+   +-----------+------------+
                     |                            |
                     | dedup by message_id       | rules evaluation
                     | write into telemetry      | write alerts
                     v                            v
         +------------------------+   +------------------------+
         | PostgreSQL/TimescaleDB |   | alerts / alert_rules   |
         +------------------------+   +------------------------+
```

### 17.3 Stage 3-4 Realtime And Alerts

```text
                       Stage 3-4
            (realtime and alerts in the interface)

+------------------+        SignalR push         +----------------------+
| React UI         | <-------------------------  | ASP.NET Core API     |
| dashboard        |                             | /hubs/telemetry      |
| device page      |                             +----------+-----------+
| alerts feed      |                                        |
+---------+--------+                                        |
          |                                                 |
          | GET /api/devices                                |
          | GET /api/telemetry                              |
          | GET /api/alerts                                 |
          v                                                 v
+--------------------------------------------------------------------------+
|                         Backend API                                      |
|--------------------------------------------------------------------------|
| reads data from PostgreSQL                                               |
| filters by tenant_id from JWT                                            |
| pushes new telemetry/alerts to UI through SignalR                        |
+----------------------------------+---------------------------------------+
                                   |
                                   v
+--------------------------------------------------------------------------+
|                    PostgreSQL + TimescaleDB                              |
+--------------------------------------------------------------------------+
```

## 18. Step-By-Step Request Flow

### 18.1 Client Registration

```text
1. Client registration

+-------------------+
| User              |
| (future admin)    |
+---------+---------+
          |
          | POST /api/auth/register
          | { tenantName, email, password }
          v
+------------------------------+
| Backend API                  |
|------------------------------|
| 1. creates tenant            |
| 2. creates user(role=admin)  |
| 3. hashes password           |
| 4. issues JWT                |
+---------------+--------------+
                |
                v
+------------------------------+
| PostgreSQL                   |
|------------------------------|
| tenants                      |
| users                        |
+------------------------------+

Result:
- new tenant exists
- first admin exists
- admin receives JWT
```

### 18.2 Device Creation And Token Issuance

```text
2. Device creation and token issuance

+-------------------+
| Admin in UI       |
+---------+---------+
          |
          | POST /api/devices
          | Authorization: Bearer JWT
          v
+------------------------------+
| Backend API                  |
|------------------------------|
| 1. reads tenant_id from JWT  |
| 2. creates device            |
+---------------+--------------+
                |
                v
+------------------------------+
| PostgreSQL                   |
|------------------------------|
| devices                      |
+------------------------------+

Then:

+-------------------+
| Admin in UI       |
+---------+---------+
          |
          | POST /api/device-tokens
          | Authorization: Bearer JWT
          v
+------------------------------+
| Backend API                  |
|------------------------------|
| 1. generates device token    |
| 2. returns token once        |
| 3. stores only hash in DB    |
+---------------+--------------+
                |
                v
+------------------------------+
| PostgreSQL                   |
|------------------------------|
| device_tokens                |
+------------------------------+

Result:
- device exists
- token exists
- token is configured on the physical device
```

### 18.3 Telemetry Upload From Device

```text
3. Device sends telemetry

+-------------------+
| IoT Device        |
+---------+---------+
          |
          | POST /ingest
          | Authorization: Bearer <device-token>
          | JSON payload
          v
+------------------------------+
| Ingest API                   |
|------------------------------|
| 1. validates token           |
| 2. finds device_id           |
| 3. finds tenant_id           |
| 4. validates payload         |
| 5. accepts message_id        |
+---------------+--------------+
                |
                |
                | Stage 1 MVP
                v
+------------------------------+
| PostgreSQL + TimescaleDB     |
|------------------------------|
| telemetry                    |
+------------------------------+
```

What is saved:

- `device_id`
- `tenant_id`
- `timestamp`
- `message_id`
- `temperature`
- `humidity`
- `payload`

Result:

- telemetry is stored
- it is already linked both to device and tenant

### 18.4 How The User Sees Data In UI

```text
4. How user sees data in UI

+-------------------+
| Admin/User in UI  |
+---------+---------+
          |
          | GET /api/devices
          | GET /api/telemetry?deviceId=...
          | Authorization: Bearer JWT
          v
+------------------------------+
| Backend API                  |
|------------------------------|
| 1. reads tenant_id from JWT  |
| 2. filters data              |
| 3. blocks foreign tenant     |
+---------------+--------------+
                |
                v
+------------------------------+
| PostgreSQL + TimescaleDB     |
|------------------------------|
| devices                      |
| telemetry                    |
+------------------------------+
                |
                v
+-------------------+
| React UI          |
|-------------------|
| device list       |
| device card       |
| telemetry chart   |
+-------------------+
```

Result:

- user sees only their own tenant data
- user opens a device page
- user sees telemetry history on charts

### 18.5 Future Kafka Flow

```text
5. Future flow after Kafka

+-------------------+
| IoT Device        |
+---------+---------+
          |
          | POST /ingest
          v
+------------------------------+
| Ingest API                   |
|------------------------------|
| validates token              |
| enriches tenant_id/device_id |
| publish -> telemetry.raw     |
+---------------+--------------+
                |
                v
+------------------------------+
| Kafka                        |
|------------------------------|
| topic: telemetry.raw         |
| key: device_id               |
+---------------+--------------+
                |
                v
+------------------------------+
| Worker #1 Storage            |
|------------------------------|
| 1. reads event               |
| 2. checks duplicates         |
| 3. writes into telemetry     |
+---------------+--------------+
                |
                v
+------------------------------+
| PostgreSQL + TimescaleDB     |
+------------------------------+
```

This version means:

- API accepts quickly
- DB writes are delegated to workers
- system becomes easier to scale

### 18.6 Realtime And Alerts

```text
6. Realtime and alerts

New telemetry:
Device -> API/Kafka -> DB -> SignalR -> UI updated without refresh

Alerts:
Device -> API/Kafka -> Alerts Worker -> alerts table -> SignalR -> UI shows alert
```

## 19. Final Summary

The planned MVP is a layered monitoring system:

1. Users and tenants are created first.
2. Devices are registered and receive tokens.
3. Devices send telemetry over HTTP in JSON format.
4. Backend authenticates devices and links incoming data to the correct tenant.
5. Data is stored in PostgreSQL/TimescaleDB.
6. Users authenticate with JWT and see only their tenant's data.
7. Kafka and workers are added next for scalable processing.
8. SignalR adds realtime UI updates.
9. Rules and alerts add automated monitoring behavior.

This means the MVP starts simple, but the architecture is already shaped for growth.
