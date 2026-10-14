"""Staff profiles and first-visit applications; preserve all purchase history."""

from migrations.sql import execute

revision = "0004_staff_visits"
down_revision = "0003_access_commerce"
branch_labels = depends_on = None


def upgrade():
    execute(r"""
        CREATE TABLE trainer_profiles (
            user_id BIGINT PRIMARY KEY REFERENCES users(id),
            zones TEXT NOT NULL CHECK(zones IN ('gym','pool','both')),
            experience_years SMALLINT NOT NULL CHECK(experience_years BETWEEN 0 AND 80),
            specialization_ru TEXT NOT NULL, specialization_en TEXT NOT NULL,
            bio_ru TEXT NOT NULL, bio_en TEXT NOT NULL,
            education_ru TEXT NOT NULL DEFAULT '', education_en TEXT NOT NULL DEFAULT ''
        );
        CREATE TABLE guest_visit_requests (
            id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
            name TEXT NOT NULL CHECK(length(btrim(name)) BETWEEN 1 AND 80),
            phone TEXT NOT NULL CHECK(phone ~ '^\+[0-9]{7,15}$'),
            status TEXT NOT NULL DEFAULT 'pending'
                CHECK(status IN ('pending','confirmed','rejected','cancelled','used')),
            visit_date DATE, created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
            decided_at TIMESTAMPTZ, decided_by BIGINT REFERENCES users(id),
            used_at TIMESTAMPTZ, used_by BIGINT REFERENCES users(id),
            CHECK(status NOT IN ('confirmed','used') OR visit_date IS NOT NULL),
            CHECK((decided_at IS NULL)=(decided_by IS NULL)),
            CHECK((used_at IS NULL)=(used_by IS NULL)),
            CHECK((status='used')=(used_at IS NOT NULL))
        );
        CREATE UNIQUE INDEX guest_visit_open_phone ON guest_visit_requests(phone)
            WHERE status IN ('pending','confirmed');
        CREATE UNIQUE INDEX guest_visit_used_phone ON guest_visit_requests(phone)
            WHERE status='used';
        CREATE INDEX guest_visit_phone ON guest_visit_requests(phone,created_at);
        CREATE TABLE guest_visit_zones (
            request_id BIGINT NOT NULL REFERENCES guest_visit_requests(id),
            zone_id BIGINT NOT NULL REFERENCES zones(id), PRIMARY KEY(request_id,zone_id)
        );
    """)


def downgrade():
    execute("DROP TABLE guest_visit_zones, guest_visit_requests, trainer_profiles;")
