"""Persistent carts, immutable orders and simulated access purchases."""

from migrations.sql import execute

revision = "0003_access_commerce"
down_revision = "0002_auth"
branch_labels = depends_on = None


def upgrade():
    execute("""
        CREATE TABLE carts (
            id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
            client_id BIGINT UNIQUE REFERENCES users(id), guest_hash BYTEA UNIQUE,
            version BIGINT NOT NULL DEFAULT 0 CHECK(version>=0),
            CHECK ((client_id IS NULL) <> (guest_hash IS NULL)),
            CHECK (guest_hash IS NULL OR octet_length(guest_hash)=32)
        );
        CREATE TABLE discounts (
            id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
            code TEXT NOT NULL UNIQUE, kind TEXT NOT NULL CHECK(kind IN ('percent','fixed')),
            value NUMERIC(14,2) NOT NULL CHECK(value>0 AND value<>'NaN'),
            is_active BOOLEAN NOT NULL DEFAULT true,
            CHECK(kind<>'percent' OR value<=100)
        );
        CREATE TABLE exchange_rates (
            id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
            currency TEXT NOT NULL CHECK(currency IN ('USD','EUR')),
            byn_per_unit NUMERIC(18,8) NOT NULL CHECK(byn_per_unit>0 AND byn_per_unit<>'NaN'),
            effective_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
            UNIQUE(currency,effective_at)
        );
        CREATE TABLE orders (
            id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
            client_id BIGINT NOT NULL REFERENCES users(id),
            status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','paid','cancelled')),
            cart_version BIGINT NOT NULL, idempotency_key UUID NOT NULL,
            request_hash BYTEA NOT NULL CHECK(octet_length(request_hash)=32),
            subtotal_byn NUMERIC(14,2) NOT NULL CHECK(subtotal_byn>0 AND subtotal_byn<>'NaN'),
            discount_byn NUMERIC(14,2) NOT NULL CHECK(discount_byn>=0),
            total_byn NUMERIC(14,2) NOT NULL CHECK(total_byn>=0), promo_code TEXT,
            currency TEXT NOT NULL CHECK(currency IN ('BYN','USD','EUR')),
            total_currency NUMERIC(14,2) NOT NULL CHECK(total_currency>=0),
            byn_per_unit NUMERIC(18,8) NOT NULL CHECK(byn_per_unit>0 AND byn_per_unit<>'NaN'),
            rate_date TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
            CHECK(total_byn=subtotal_byn-discount_byn), UNIQUE(client_id,idempotency_key)
        );
        CREATE INDEX orders_client_idx ON orders(client_id,created_at DESC);
    """)
    for table, parent, reference in (
        ("cart_items", "cart_id", "carts"),
        ("order_items", "order_id", "orders"),
    ):
        execute(f"""
            CREATE TABLE {table} (
                id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                {parent} BIGINT NOT NULL REFERENCES {reference}(id),
                access_offer_id BIGINT NOT NULL REFERENCES access_offers(id),
                offer_revision BIGINT NOT NULL CHECK(offer_revision>0),
                access_kind TEXT NOT NULL CHECK(access_kind IN ('membership','single_visit')),
                duration_months SMALLINT, selected_date DATE NOT NULL,
                price_byn NUMERIC(14,2) NOT NULL CHECK(price_byn>0 AND price_byn<>'NaN'),
                starts_at TIMESTAMPTZ NOT NULL, ends_at TIMESTAMPTZ NOT NULL,
                CHECK(ends_at>starts_at),
                CHECK((access_kind='membership' AND duration_months IS NOT NULL
                       AND duration_months IN (1,3,12)) OR
                      (access_kind='single_visit' AND duration_months IS NULL))
            );
            CREATE INDEX {table}_parent_idx ON {table}({parent});
            CREATE INDEX {table}_offer_idx ON {table}(access_offer_id);
        """)
    execute("""
        CREATE TABLE cart_item_zones (
            cart_item_id BIGINT NOT NULL REFERENCES cart_items(id) ON DELETE CASCADE,
            zone_id BIGINT NOT NULL REFERENCES zones(id), PRIMARY KEY(cart_item_id,zone_id)
        );
        CREATE TABLE order_item_zones (
            order_item_id BIGINT NOT NULL REFERENCES order_items(id),
            zone_id BIGINT NOT NULL REFERENCES zones(id), PRIMARY KEY(order_item_id,zone_id)
        );
        CREATE INDEX order_item_zones_zone_idx ON order_item_zones(zone_id,order_item_id);
        CREATE TABLE cart_requests (
            cart_id BIGINT NOT NULL REFERENCES carts(id), idempotency_key UUID NOT NULL,
            request_hash BYTEA NOT NULL CHECK(octet_length(request_hash)=32),
            PRIMARY KEY(cart_id,idempotency_key)
        );
        CREATE TABLE payments (
            id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
            order_id BIGINT NOT NULL REFERENCES orders(id), idempotency_key UUID NOT NULL,
            requested_success BOOLEAN NOT NULL,
            status TEXT NOT NULL CHECK(status IN ('succeeded','failed')), reason TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
            CHECK((status='succeeded' AND reason IS NULL) OR (status='failed' AND reason IS NOT
                NULL)),
            UNIQUE(order_id,idempotency_key)
        );
        CREATE UNIQUE INDEX payments_success_idx ON payments(order_id) WHERE status='succeeded';
        CREATE TABLE memberships (
            id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
            client_id BIGINT NOT NULL REFERENCES users(id),
            starts_at TIMESTAMPTZ NOT NULL, ends_at TIMESTAMPTZ NOT NULL,
            cancelled_at TIMESTAMPTZ, CHECK(ends_at>starts_at)
        );
        CREATE INDEX memberships_client_idx ON memberships(client_id,starts_at,ends_at);
        CREATE TABLE membership_issuances (
            membership_id BIGINT PRIMARY KEY REFERENCES memberships(id),
            order_item_id BIGINT NOT NULL UNIQUE REFERENCES order_items(id)
        );
        CREATE TABLE single_visit_passes (
            id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
            client_id BIGINT NOT NULL REFERENCES users(id),
            order_item_id BIGINT NOT NULL UNIQUE REFERENCES order_items(id),
            starts_at TIMESTAMPTZ NOT NULL, ends_at TIMESTAMPTZ NOT NULL,
            cancelled_at TIMESTAMPTZ, redeemed_at TIMESTAMPTZ,
            redeemed_by_user_id BIGINT REFERENCES users(id), CHECK(ends_at>starts_at),
            CHECK((redeemed_at IS NULL)=(redeemed_by_user_id IS NULL))
        );
        CREATE INDEX single_visit_client_idx ON single_visit_passes(client_id,starts_at);
        CREATE TABLE notifications (
            id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
            recipient_user_id BIGINT NOT NULL REFERENCES users(id),
            order_id BIGINT REFERENCES orders(id), title_ru TEXT NOT NULL,title_en TEXT NOT NULL,
            body_ru TEXT NOT NULL,body_en TEXT NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(), read_at TIMESTAMPTZ
        );
        CREATE INDEX notifications_recipient_idx ON notifications(recipient_user_id,created_at
            DESC);
        CREATE FUNCTION protect_purchase_history() RETURNS trigger LANGUAGE plpgsql AS $$
        BEGIN
            IF TG_TABLE_NAME='orders' AND TG_OP='UPDATE' THEN
                IF (to_jsonb(NEW)-'status')=(to_jsonb(OLD)-'status')
                   AND OLD.status='pending' AND NEW.status IN ('paid','cancelled') THEN
                    RETURN NEW;
                END IF;
            END IF;
            RAISE EXCEPTION 'Purchase history is immutable' USING ERRCODE='23514';
        END; $$;
        CREATE TRIGGER immutable_orders BEFORE UPDATE OR DELETE ON orders
            FOR EACH ROW EXECUTE FUNCTION protect_purchase_history();
        CREATE TRIGGER immutable_order_items BEFORE UPDATE OR DELETE ON order_items
            FOR EACH ROW EXECUTE FUNCTION protect_purchase_history();
        CREATE TRIGGER immutable_order_zones BEFORE UPDATE OR DELETE ON order_item_zones
            FOR EACH ROW EXECUTE FUNCTION protect_purchase_history();
        CREATE TRIGGER immutable_payments BEFORE UPDATE OR DELETE ON payments
            FOR EACH ROW EXECUTE FUNCTION protect_purchase_history();
        CREATE TRIGGER immutable_audit BEFORE UPDATE OR DELETE ON audit_logs
            FOR EACH ROW EXECUTE FUNCTION protect_purchase_history();
        CREATE FUNCTION check_order_completion() RETURNS trigger LANGUAGE plpgsql AS $$
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
                IF NOT EXISTS(SELECT 1 FROM order_item_zones WHERE order_item_id=item.id) THEN
                    RAISE EXCEPTION 'Order item needs zones' USING ERRCODE='23514';
                END IF;
                SELECT (SELECT count(*) FROM membership_issuances WHERE order_item_id=item.id)
                     + (SELECT count(*) FROM single_visit_passes WHERE order_item_id=item.id)
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
                               OR p.starts_at<>item.starts_at OR p.ends_at<>item.ends_at)) THEN
                    RAISE EXCEPTION 'Invalid access issuance' USING ERRCODE='23514';
                END IF;
            END LOOP;
            RETURN NULL;
        END; $$;
        CREATE CONSTRAINT TRIGGER order_completion AFTER INSERT OR UPDATE ON orders
            DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION check_order_completion();
        CREATE CONSTRAINT TRIGGER order_items_completion AFTER INSERT ON order_items
            DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION check_order_completion();
        CREATE CONSTRAINT TRIGGER order_zones_completion AFTER INSERT ON order_item_zones
            DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION check_order_completion();
        CREATE CONSTRAINT TRIGGER payments_completion AFTER INSERT ON payments
            DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION check_order_completion();
    """)


def downgrade():
    execute("""
        DROP TABLE notifications, single_visit_passes, membership_issuances, memberships,
            payments, cart_requests, order_item_zones, cart_item_zones, order_items, cart_items,
            orders, exchange_rates, discounts, carts;
        DROP TRIGGER immutable_audit ON audit_logs;
        DROP FUNCTION check_order_completion();
        DROP FUNCTION protect_purchase_history();
    """)
