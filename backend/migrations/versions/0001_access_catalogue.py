"""Public access catalogue; no group training or membership coaching permissions."""

from alembic import op

revision = "0001_access_catalogue"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    op.execute("""
        CREATE TABLE zones (
            id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
            code TEXT NOT NULL UNIQUE CHECK (code IN ('gym_cardio', 'pool')),
            name_ru TEXT NOT NULL CHECK (btrim(name_ru) <> ''),
            name_en TEXT NOT NULL CHECK (btrim(name_en) <> ''),
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
        )
    """)
    op.execute("""
        CREATE TABLE access_offers (
            id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
            code TEXT NOT NULL UNIQUE CHECK (code ~ '^[A-Z][A-Z0-9_]*$'),
            access_kind TEXT NOT NULL CHECK (access_kind IN ('membership', 'single_visit')),
            name_ru TEXT NOT NULL CHECK (btrim(name_ru) <> ''),
            name_en TEXT NOT NULL CHECK (btrim(name_en) <> ''),
            description_ru TEXT NOT NULL DEFAULT '',
            description_en TEXT NOT NULL DEFAULT '',
            duration_months SMALLINT,
            price_byn NUMERIC(14,2) NOT NULL CHECK (price_byn > 0 AND price_byn <> 'NaN'),
            revision BIGINT NOT NULL DEFAULT 1 CHECK (revision > 0),
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
            CHECK (
                (access_kind = 'membership' AND duration_months IS NOT NULL
                 AND duration_months IN (1, 3, 12))
                OR (access_kind = 'single_visit' AND duration_months IS NULL)
            )
        )
    """)
    op.execute("""
        CREATE TABLE access_offer_zones (
            access_offer_id BIGINT NOT NULL REFERENCES access_offers(id) ON DELETE CASCADE,
            zone_id BIGINT NOT NULL REFERENCES zones(id) ON DELETE RESTRICT,
            PRIMARY KEY (access_offer_id, zone_id)
        )
    """)
    op.execute("""
        CREATE INDEX access_offer_zones_zone_idx ON access_offer_zones(zone_id, access_offer_id)
    """)
    op.execute("""
        CREATE FUNCTION check_access_offer_zones() RETURNS trigger LANGUAGE plpgsql AS $$
        DECLARE
            affected_id BIGINT;
            affected_ids BIGINT[];
        BEGIN
            IF TG_TABLE_NAME = 'access_offers' THEN
                affected_ids := ARRAY[NEW.id];
            ELSIF TG_OP = 'INSERT' THEN
                affected_ids := ARRAY[NEW.access_offer_id];
            ELSIF TG_OP = 'DELETE' THEN
                affected_ids := ARRAY[OLD.access_offer_id];
            ELSE
                affected_ids := ARRAY[OLD.access_offer_id, NEW.access_offer_id];
            END IF;
            FOR affected_id IN SELECT DISTINCT unnest(affected_ids) ORDER BY 1 LOOP
                PERFORM id FROM access_offers WHERE id = affected_id FOR NO KEY UPDATE;
                IF FOUND AND NOT EXISTS (
                    SELECT 1 FROM access_offer_zones WHERE access_offer_id = affected_id
                ) THEN
                    RAISE EXCEPTION 'Access offer requires at least one zone'
                        USING ERRCODE = '23514';
                END IF;
            END LOOP;
            RETURN NULL;
        END;
        $$
    """)
    op.execute("""
        CREATE CONSTRAINT TRIGGER access_offer_requires_zones
        AFTER INSERT OR UPDATE ON access_offers
        DEFERRABLE INITIALLY DEFERRED
        FOR EACH ROW EXECUTE FUNCTION check_access_offer_zones()
    """)
    op.execute("""
        CREATE CONSTRAINT TRIGGER access_offer_zone_changes
        AFTER INSERT OR UPDATE OR DELETE ON access_offer_zones
        DEFERRABLE INITIALLY DEFERRED
        FOR EACH ROW EXECUTE FUNCTION check_access_offer_zones()
    """)


def downgrade():
    op.execute("DROP TABLE access_offer_zones")
    op.execute("DROP TABLE access_offers")
    op.execute("DROP FUNCTION check_access_offer_zones()")
    op.execute("DROP TABLE zones")
