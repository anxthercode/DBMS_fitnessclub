"""Execute fixed migration SQL statements individually for the asyncpg driver."""

import re

from alembic import op


def execute(sql):
    statement = ""
    for token in re.findall(r"\$\$.*?\$\$|'(?:''|[^'])*'|;|[^;$']+|.", sql, re.S):
        if token == ";":
            if statement.strip():
                op.execute(statement)
            statement = ""
        else:
            statement += token
    if statement.strip():
        op.execute(statement)
