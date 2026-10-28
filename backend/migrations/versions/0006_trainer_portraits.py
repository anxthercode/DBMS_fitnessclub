"""Explicit portrait keys for fictional coursework trainers; existing profiles stay unchanged."""

from alembic import op

revision = "0006_trainer_portraits"
down_revision = "0005_personal_training"
branch_labels = depends_on = None


def upgrade():
    op.execute("""ALTER TABLE trainer_profiles ADD COLUMN portrait_key TEXT
        CHECK (portrait_key IN ('trainer-01', 'trainer-02', 'trainer-03'))""")
    op.execute("""CREATE UNIQUE INDEX trainer_profiles_portrait_key
        ON trainer_profiles(portrait_key) WHERE portrait_key IS NOT NULL""")


def downgrade():
    op.execute("ALTER TABLE trainer_profiles DROP COLUMN portrait_key")
