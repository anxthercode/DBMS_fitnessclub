# NORTHSIDE Database Plan — Simplified Coursework Release

**11 October 2026.** The user delegated product decisions and requested a smaller release. The policies below replace the earlier unapproved package proposals. The [specification](../project-specification.md) defines the selected scope; diagrams and the original 18-table baseline remain unchanged.

## Implemented and planned

Migrations through `0006_trainer_portraits` implement **30 application tables**, excluding `alembic_version`. Email delivery/verification/recovery is disabled for this release; existing unused token tables remain. No SMTP setup is needed.

The seven additions to the original implemented 23-table slice are `trainer_profiles`, `training_offers`, `training_credits`, `training_slots`, `bookings`, `guest_visit_requests` and `guest_visit_zones`. No `training_packages` table is used. The original 18-table baseline below is historical.

First-visit review reads existing application, account, membership, pass and booking records in one consistent snapshot. It matches normalized phones without merging identities, and counts only used passes/visits and attended training as evidence. Training cart edits retain the existing item ID and validate cart version and current offer price/revision. These UI/read-model additions require no migration.

## Candidate business rules

The heading anchor is retained for existing links; these policies are now selected, not awaiting approval.

| Decision | Selected minimum |
| --- | --- |
| P1 — Products | One 60-minute personal session per line; no bundles or expiry. Initial illustrative price: 30 BYN in either zone, editable for future sales. |
| P2 — Trainer and zone | One zone per paid unit; any available matching-zone trainer. Booking requires a non-cancelled membership covering the entire session and zone. |
| P3 — Purchase | Reuse the existing cart/order/simulated payment flow, allowing mixed access/training lines with the existing 12-line limit. Issue one training unit per paid training line. Buy first, select a slot afterwards; no time holds. |
| P4 — Accounting | Pending/approved bookings reserve a unit. Attendance or approved-session no-show consumes it. Rejection, timely client cancellation or club cancellation releases it. Clients cancel at least 12 hours before start; late self-cancellation is blocked. No exception/refund engine. |
| P5 — Membership | Units do not expire or pause. Membership expiry does not consume them; another qualifying membership is needed to book. No paid-membership cancellation or manual free grants in this release. |

## Administration and visits

- Create the first administrator through a local command. Use basic user/trainer/offer forms and read-only order/payment/access lists; keep simple discount/rate forms.
- Deactivating a client/trainer releases future bookings and reserved units transactionally; trainer deactivation cancels future slots. Preserve history.
- A paid single-visit pass can be redeemed once by an administrator on its valid Minsk date. Purchase does not redeem it.
- First visit: name/phone, manual administrator eligibility check, date/zones, confirmation and one-time use. One pending/confirmed request per normalized phone; used claims block another free visit, rejected/cancelled requests allow reapplication. No identity resolution or automatic phone messaging.
- Notifications stay in the site. Email is not an authorization condition; addresses remain unverified. Password hashes, sessions and server-side role/ownership checks remain mandatory.

## Delivery order

1. Disable email-dependent actions and prompts, preserving auth security and data.
2. Administrator tools, first-visit storage and paid-pass redemption.
3. Single-session sales, trainer slots and transactional bookings.
4. Access-offer JSON/XML/CSV exchange, one sales report in DOCX/XLSX/PDF, four SQL summaries and focused end-to-end verification.

See [physical design](schema-design-details.md#revision-2-candidate) and [actual implementation status](../implementation-status.md). The linked status distinguishes implemented features from remaining acceptance work.

---

Migration `0006_trainer_portraits` adds an optional, checked portrait key and a partial unique index to `trainer_profiles`; no tables are added. The explicit coursework seed creates fictional trainer accounts with random Argon2id passwords and discards the plaintext. It never adopts existing emails, overwrites profiles or marks email verified. Ordinary profile APIs cannot assign portrait keys.

## Preserved 18-table baseline — historical only

The original text below is retained for traceability. Its older email, group-training, package, renewal and overlap rules do not override the selected release above. The historical PDF is unchanged.

<!-- preserved-baseline-start -->
# Краткая схема базы данных фитнес-клуба

> **Baseline requiring revision.** This 18-table proposal and its PDF are historical design materials. The [root README](../../README.md#3-functional-scope-and-agreed-rules) defines current zone-based overlap, selected dates, single visits and first-visit requirements. Reconcile those rules before schema approval; this document does not authorize migrations or seeds.

Версия для согласования, 30.09.2026. Четыре страницы в [печатной версии PDF](schema-proposal.pdf). Полные атрибуты, индексы, ограничения и технические варианты сохранены в [подробной спецификации](schema-design-details.md). Миграции и приложение пока не создаются.

## 1. Назначение и состав

PostgreSQL хранит пользователей, тарифы и оплаченные периоды абонементов, расписание, заявки, покупки, уведомления и аудит. Модель обеспечивает сохранение финансовой истории, SQL-отчётность и конкурентную работу. Архитектура: React → FastAPI → PostgreSQL; явный SQL через asyncpg, без ORM.

| Таблица | Назначение |
|---|---|
| `users` | Учётные записи клиентов, тренеров и администраторов |
| `trainer_profiles` | Специализация и описание тренера на RU/EN |
| `auth_sessions` | Сессии входа, сроки и отзыв доступа |
| `email_verification_tokens` | Одноразовое подтверждение email |
| `membership_plans` | Тарифы, цены, сроки и условия доступа |
| `carts` | Одна текущая корзина клиента и её версия |
| `cart_items` | Тарифы в корзине, количество и порядок |
| `discounts` | Процентные и фиксированные промокоды |
| `exchange_rates` | Версии курсов USD/EUR к BYN |
| `orders` | Покупатель, состояние заказа и финансовые итоги |
| `order_items` | Снимки купленных тарифов, цен и скидок |
| `payments` | Завершённые попытки демонстрационной оплаты |
| `memberships` | Выданные клиенту периоды доступа и отмена |
| `membership_issuances` | Связь единицы покупки с абонементом |
| `training_slots` | Расписание тренеров и вместимость занятий |
| `bookings` | Заявки, решения, посещения и неявки |
| `notifications` | Уведомления в интерфейсе и доставка email |
| `audit_logs` | Аудит действий пользователей и системы |

Всего 18 таблиц. Отдельных таблиц дополнительных услуг, возвратов, проблемных заявок и готовых отчётных файлов нет. Проблемная заявка определяется запросом к существующим данным.

<!-- pagebreak -->

## 2. Принятые бизнес-правила

**Пользователи.** Одна учётная запись имеет одну роль: CLIENT, TRAINER или ADMIN. Клиент регистрируется сам, тренера создаёт администратор, первого администратора — отдельная команда. Гость не является ролью БД. Доступ и владение проверяются backend.

**Покупки.** Корзина предназначена только для абонементов. Индивидуальные и групповые занятия доступны через расписание. Оплата демонстрационная; неуспешные попытки сохраняются. Повтор одного платежа не выдаёт абонемент повторно. Денежных возвратов в v1 нет.

**Абонементы.** Тарифы: месяц, три месяца и год, без лимита посещений. Первый период начинается после успешной оплаты, продление — после окончания уже оплаченного периода. У клиента не может быть одновременно действующих пересекающихся абонементов. Для записи проверяется действие абонемента на время занятия.

**Резервирование.** Вместимость индивидуального слота равна 1; для группы её задаёт тренер. Заявка pending сразу занимает место. Подтверждение переводит её в approved, не создавая второй резерв. Отклонение или отмена освобождает место. Повторная запись на тот же слот запрещена.

**Пересечения клиента.** Запрещены пересекающиеся активные бронирования: учитываются все pending и approved по всем абонементам и у любых тренеров. Интервалы [начало, конец) допускают занятия подряд. Проверка после блокировки строки клиента защищает также от одновременных записей на разные слоты.

**Отмена и контроль.** Клиент отменяет заявку не позднее чем за 12 часов до начала, позже — через администратора. Тренер после занятия отмечает посещение или неявку. Необработанные за 12 часов заявки показываются администратору. Прошедшее занятие нельзя подтвердить задним числом. Администратор подтверждает допустимую заявку, отклоняет или отменяет её.

**Финансы.** Базовая валюта BYN, дополнительное отображение — USD/EUR. Курсы вводит администратор. На заказ действует один промокод; итог неотрицателен. Цена, скидка, итог, валюта и курс сохраняются в истории. Финансовые записи не удаляются физически.

**Остальные требования.** Email, JSON/XML/CSV, Word/Excel/PDF, SQL-аналитика, RU/EN и защита данных остаются обязательными независимо от состава Use Case Diagram. Деньги — NUMERIC, время — TIMESTAMPTZ, часовой пояс — Europe/Minsk.

Технические варианты D1–D10 сохранены в подробном документе с исходными отметками согласования. В частности, проект использует вычисляемый статус абонемента и серверные сессии. Подготовка графики не означает разрешения на миграции.

<!-- pagebreak -->

## 3. Основные связи и целостность

| Связь | Кардинальность |
|---|---|
| Пользователь — профиль тренера / корзина | 1 : 0..1 |
| Пользователь — сессии / токены / заказы / абонементы | 1 : 0..N |
| Корзина — позиции; тариф — позиции корзины/заказа | 1 : 0..N |
| Заказ — позиции | 1 : 1..N к commit |
| Заказ — попытки оплаты | 1 : 0..N; успешная ≤ 1 |
| Заказ — промокод / версия курса | N : 0..1 |
| Позиция заказа — выдачи абонементов | 1 : 0..N; после оплаты quantity |
| Абонемент — запись о выдаче | 1 : 1 к commit |
| Тренер — слоты; слот — заявки; абонемент — заявки | 1 : 0..N |
| Пользователь — уведомления / действия аудита | 1 : 0..N |

Для TRAINER профиль обязателен. Исполнитель системного аудита может отсутствовать. Клиент заявки определяется через memberships, тренер и время — через training_slots. Связь абонемента с покупкой проходит через membership_issuances и order_items. Это сохраняет 3НФ без дублирования владельца и времени в bookings.

- **PK, FK, NOT NULL:** идентичность строк, корректные связи и обязательные данные. Уникальны нормализованные email, коды тарифов/промокодов, хеши токенов и ключи выдач.
- **CHECK:** допустимые роли/состояния, положительные количества и вместимость, порядок дат, скидки и равенство денежных итогов.
- **GiST/EXCLUDE:** непересечение неотменённых периодов одного клиента и слотов одного тренера; предусмотрено расширение btree_gist.
- **Частичная уникальность:** не более одного успешного платежа на заказ; запрет повторной незакрытой/состоявшейся записи по абонементу на слот.
- **Транзакционные проверки:** вместимость и пересечения активных заявок клиента. UNIQUE одного слота не защищает от пересечений разных слотов; CHECK не проверяет другие строки.
- **Проверки при commit:** непустой заказ, суммы строк, соответствие платежа, полнота выдачи приобретённых единиц и правильный владелец.
- **История:** финансовые снимки, платежи и выдачи неизменяемы. Архивирование и отмена не стирают исторические записи.

Индексы обслуживают историю клиента, расписание, резерв слота, просроченные pending, продажи и доставку уведомлений. Полный перечень ключей и предикатов сохранён в разделе 8 подробной спецификации.

<!-- pagebreak -->

## 4. Критические транзакции

**Оформление заказа.** Блокируются клиент и корзина; проверяются версия и ключ идемпотентности. Считываются тарифы, промокод и курс, сохраняются снимки строк и итогов. Корзина очищается, версия увеличивается. Повтор запроса возвращает уже созданный заказ.

**Оплата и выдача.** Блокируются клиент и заказ. Неуспешная попытка сохраняется без выдачи. При успехе платёж, paid, приобретённые периоды, связи выдач, аудит и уведомления фиксируются вместе. Блокировка клиента сериализует оплату разных заказов; новые периоды следуют за оплаченной очередью. Уникальные ключи предотвращают повторную выдачу.

**Создание заявки.** Блокировки: клиент → абонемент → слот. После ожидания обновляется время проверки. Проверяются права, абонемент, будущий открытый слот, отсутствие повторной и пересекающейся активной записи клиента. Отдельным запросом подсчитываются pending + approved. При наличии места создаётся pending; commit закрепляет резерв, аудит и уведомление. При отказе — rollback.

**Решение по заявке.** Используется тот же порядок, затем блокируется заявка. Проверяются исполнитель и актуальный статус. Перед подтверждением повторно проверяются время, абонемент и пересечения с другими заявками клиента. Подтверждение сохраняет резерв, отклонение/отмена освобождает его. Конкурирующее решение не перезаписывается.

**Отмена и посещение.** Отмена клиентом учитывает 12-часовой порог; позднюю отмену выполняет администратор. Отмена слота закрывает его активные заявки атомарно. Отмена абонемента обрабатывает его будущие заявки. Посещение/неявка отмечается после окончания, с проверкой тренера и состояния.

Операция использует одно соединение asyncpg. Соблюдается единый порядок блокировок; строки одного типа обрабатываются по ID. Пересечения проверяются после блокировки клиента, вместимость — после блокировки слота. Email отправляется после commit, сбой доставки не отменяет бизнес-операцию. Просроченные заявки определяются SQL-запросом без отдельного фонового сервиса.

## 5. Графические материалы

- Original detailed ER baseline: [PNG](../diagrams/er-diagram.png), [editable draw.io](../diagrams/er-diagram.drawio).
- Training-booking algorithm: [PNG](../diagrams/fitness_club_algorithm.png), [editable draw.io](../diagrams/fitness_club_algorithm.drawio).
- Conceptual Chen ER view: [PNG](../diagrams/fitness_club_chen.png), [editable draw.io](../diagrams/fitness_club_chen.drawio).
- [Use Case Diagram](../diagrams/use-case-diagram.png) — неизменённое изображение предыдущей курсовой; редактируемого исходника в проекте нет.

The [current diagram inventory](../../README.md#6-database-design-and-preserved-diagrams) replaces the obsolete diagram README. Diagram sources and images remain unchanged. Schema approval is required before migrations and seed data.
