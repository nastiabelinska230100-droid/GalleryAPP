import psycopg2
import psycopg2.extras
from contextlib import contextmanager
from backend.config import DATABASE_URL

psycopg2.extras.register_uuid()


def get_connection():
    return psycopg2.connect(DATABASE_URL, cursor_factory=psycopg2.extras.RealDictCursor)


@contextmanager
def get_db():
    conn = get_connection()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def query(sql, params=None):
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute(sql, params)
        try:
            return cur.fetchall()
        except psycopg2.ProgrammingError:
            return []


def query_one(sql, params=None):
    rows = query(sql, params)
    return rows[0] if rows else None


def execute(sql, params=None):
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute(sql, params)


def insert_returning(sql, params=None):
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute(sql, params)
        return cur.fetchone()
