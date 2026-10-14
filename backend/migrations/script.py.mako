"""${message}"""
from alembic import op

revision = ${repr(up_revision)}
down_revision = ${repr(down_revision)}
branch_labels = ${repr(branch_labels)}
depends_on = ${repr(depends_on)}


def upgrade():
    # Use op.execute with manually written SQL. Do not generate ORM models.
    pass


def downgrade():
    pass
