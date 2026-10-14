"""Single-session commerce, trainer slots and transactional reservations."""

from migrations.sql import execute

revision = "0005_personal_training"
down_revision = "0004_staff_visits"
branch_labels = depends_on = None


def upgrade():
    execute("""
        CREATE TABLE training_offers (
            id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
            zone_id BIGINT NOT NULL UNIQUE REFERENCES zones(id),
            price_byn NUMERIC(14,2) NOT NULL CHECK(price_byn>0 AND price_byn<>'NaN'),
            revision BIGINT NOT NULL DEFAULT 1 CHECK(revision>0),
            is_active BOOLEAN NOT NULL DEFAULT true
        );
        INSERT INTO training_offers(zone_id,price_byn) SELECT id,30 FROM zones;
        CREATE TABLE training_credits (
            id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
            client_id BIGINT NOT NULL REFERENCES users(id),
            order_item_id BIGINT NOT NULL UNIQUE REFERENCES order_items(id),
            consumed_at TIMESTAMPTZ
        );
        CREATE INDEX training_credits_client ON training_credits(client_id);
        CREATE TABLE training_slots (
            id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
            trainer_id BIGINT NOT NULL REFERENCES trainer_profiles(user_id),
            zone TEXT NOT NULL CHECK(zone IN ('gym','pool')),
            title_ru TEXT NOT NULL CHECK(length(btrim(title_ru)) BETWEEN 1 AND 200),
            title_en TEXT NOT NULL CHECK(length(btrim(title_en)) BETWEEN 1 AND 200),
            starts_at TIMESTAMPTZ NOT NULL, ends_at TIMESTAMPTZ NOT NULL,
            status TEXT NOT NULL DEFAULT 'scheduled'
                CHECK(status IN ('scheduled','cancelled','completed')),
            CHECK(ends_at=starts_at+interval '60 minutes'),
            EXCLUDE USING gist (
                int8range(trainer_id,trainer_id,'[]') WITH &&,
                tstzrange(starts_at,ends_at,'[)') WITH &&
            ) WHERE (status<>'cancelled')
        );
        CREATE INDEX training_slots_start ON training_slots(starts_at,trainer_id);
        CREATE TABLE bookings (
            id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
            membership_id BIGINT NOT NULL REFERENCES memberships(id),
            training_credit_id BIGINT NOT NULL REFERENCES training_credits(id),
            training_slot_id BIGINT NOT NULL REFERENCES training_slots(id),
            status TEXT NOT NULL DEFAULT 'pending'
                CHECK(status IN ('pending','approved','rejected','cancelled','attended','no_show')),
            reason TEXT CHECK(reason IS NULL OR length(btrim(reason)) BETWEEN 1 AND 500),
            created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
            decided_at TIMESTAMPTZ, decided_by BIGINT REFERENCES users(id),
            CHECK((decided_at IS NULL)=(decided_by IS NULL))
        );
        CREATE UNIQUE INDEX booking_slot_reserved ON bookings(training_slot_id)
            WHERE status IN ('pending','approved','attended','no_show');
        CREATE UNIQUE INDEX booking_credit_reserved ON bookings(training_credit_id)
            WHERE status IN ('pending','approved','attended','no_show');
        CREATE INDEX bookings_membership ON bookings(membership_id,created_at DESC);
        ALTER TABLE notifications ADD COLUMN booking_id BIGINT REFERENCES bookings(id);
        ALTER TABLE notifications ADD CHECK(order_id IS NULL OR booking_id IS NULL);
    """)
    for table in ("cart_items", "order_items"):
        execute(f"""
            ALTER TABLE {table} ADD COLUMN training_offer_id BIGINT REFERENCES training_offers(id);
            ALTER TABLE {table} ALTER COLUMN access_offer_id DROP NOT NULL;
            ALTER TABLE {table} ALTER COLUMN selected_date DROP NOT NULL;
            ALTER TABLE {table} ALTER COLUMN starts_at DROP NOT NULL;
            ALTER TABLE {table} ALTER COLUMN ends_at DROP NOT NULL;
            DO $$ DECLARE c RECORD; BEGIN
                FOR c IN SELECT conname FROM pg_constraint WHERE conrelid='{table}'::regclass
                    AND contype='c' AND (pg_get_constraintdef(oid) LIKE '%access_kind%'
                                     OR pg_get_constraintdef(oid) LIKE '%ends_at%') LOOP
                    EXECUTE format('ALTER TABLE {table} DROP CONSTRAINT %I',c.conname);
                END LOOP;
            END; $$;
            ALTER TABLE {table} ADD CHECK(
                (access_kind='training' AND training_offer_id IS NOT NULL
                 AND access_offer_id IS NULL AND duration_months IS NULL
                 AND selected_date IS NULL AND starts_at IS NULL AND ends_at IS NULL)
                OR (access_kind IN ('membership','single_visit') AND access_offer_id IS NOT NULL
                    AND training_offer_id IS NULL AND selected_date IS NOT NULL
                    AND starts_at IS NOT NULL AND ends_at IS NOT NULL AND ends_at>starts_at
                    AND ((access_kind='membership' AND duration_months IS NOT NULL
                          AND duration_months IN (1,3,12))
                         OR (access_kind='single_visit' AND duration_months IS NULL)))
            );
            CREATE INDEX {table}_training_offer ON {table}(training_offer_id);
        """)
    execute("""
        CREATE OR REPLACE FUNCTION check_order_completion() RETURNS trigger LANGUAGE plpgsql AS $$
        DECLARE target BIGINT; current_order orders; item RECORD; issued INTEGER;
        BEGIN
            IF TG_TABLE_NAME='orders' THEN target:=NEW.id;
            ELSIF TG_TABLE_NAME='order_item_zones' THEN
                SELECT order_id INTO target FROM order_items WHERE id=NEW.order_item_id;
            ELSE target:=NEW.order_id; END IF;
            SELECT * INTO current_order FROM orders WHERE id=target;
            IF NOT FOUND THEN RETURN NULL; END IF;
            IF (SELECT count(*) FROM order_items WHERE order_id=target) NOT BETWEEN 1 AND 12
               OR (SELECT sum(price_byn) FROM order_items WHERE order_id=target)
                    <>current_order.subtotal_byn THEN
                RAISE EXCEPTION 'Invalid order totals' USING ERRCODE='23514';
            END IF;
            IF (current_order.status='paid') <> EXISTS(
                SELECT 1 FROM payments WHERE order_id=target AND status='succeeded') THEN
                RAISE EXCEPTION 'Order payment mismatch' USING ERRCODE='23514';
            END IF;
            FOR item IN SELECT * FROM order_items WHERE order_id=target LOOP
                IF NOT EXISTS(SELECT 1 FROM order_item_zones WHERE order_item_id=item.id)
                   OR (item.access_kind='training' AND
                      (SELECT count(*) FROM order_item_zones WHERE order_item_id=item.id)<>1) THEN
                    RAISE EXCEPTION 'Invalid order zones' USING ERRCODE='23514';
                END IF;
                SELECT (SELECT count(*) FROM membership_issuances WHERE order_item_id=item.id)
                     + (SELECT count(*) FROM single_visit_passes WHERE order_item_id=item.id)
                     + (SELECT count(*) FROM training_credits WHERE order_item_id=item.id)
                     INTO issued;
                IF issued <> (CASE WHEN current_order.status='paid' THEN 1 ELSE 0 END) THEN
                    RAISE EXCEPTION 'Order issuance mismatch' USING ERRCODE='23514';
                END IF;
                IF EXISTS(SELECT 1 FROM membership_issuances mi JOIN memberships m
                          ON m.id=mi.membership_id WHERE mi.order_item_id=item.id
                          AND (item.access_kind<>'membership' OR
                              m.client_id<>current_order.client_id
                               OR m.starts_at<>item.starts_at OR m.ends_at<>item.ends_at))
                   OR EXISTS(SELECT 1 FROM single_visit_passes p WHERE p.order_item_id=item.id
                          AND (item.access_kind<>'single_visit' OR
                              p.client_id<>current_order.client_id
                               OR p.starts_at<>item.starts_at OR p.ends_at<>item.ends_at))
                   OR EXISTS(SELECT 1 FROM training_credits c WHERE c.order_item_id=item.id
                          AND (item.access_kind<>'training' OR
                               c.client_id<>current_order.client_id)) THEN
                    RAISE EXCEPTION 'Invalid issuance' USING ERRCODE='23514';
                END IF;
            END LOOP;
            RETURN NULL;
        END; $$;
    """)


def downgrade():
    raise RuntimeError("Training purchases are financial history; use a forward migration.")
