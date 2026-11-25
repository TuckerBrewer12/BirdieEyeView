import asyncio
import json
import os
import re
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "data"))

from api.auth_utils import hash_password
from database.connection import DatabasePool
from database.db_manager import DatabaseManager
from load_player_data import load_data

EMAIL = "scheffler@example.com"
PASSWORD = "bench-password-123"
DATE = re.compile(r"^(\d{4})(-\d\d-\d\d)")


def years_back(value, years):
    if isinstance(value, dict):
        return {key: years_back(item, years) for key, item in value.items()}
    if isinstance(value, list):
        return [years_back(item, years) for item in value]
    if isinstance(value, str) and DATE.match(value):
        return DATE.sub(lambda m: f"{int(m.group(1)) - years}{m.group(2)}", value)
    return value


async def seed(copies: int) -> None:
    dsn = os.environ["DATABASE_URL"]
    rounds = json.loads((ROOT / "data/scheffler_rounds.json").read_text())
    with tempfile.TemporaryDirectory() as tmp:
        for years in range(copies):
            shifted = Path(tmp) / f"rounds_{years}.json"
            shifted.write_text(json.dumps(years_back(rounds, years)))
            await load_data(str(ROOT / "data/scheffler_courses.json"), str(shifted), "Scottie Scheffler", EMAIL, dsn)
    pool = DatabasePool()
    await pool.initialize(dsn=dsn)
    db = DatabaseManager(pool.pool)
    user = await db.users.get_user_by_email(EMAIL)
    await db.users.set_password_hash(str(user.id), hash_password(PASSWORD))
    await db.users.mark_email_verified(str(user.id))
    await pool.close()
    print(f"{EMAIL} / {PASSWORD} ({user.id})")


if __name__ == "__main__":
    asyncio.run(seed(int(sys.argv[1]) if len(sys.argv) > 1 else 4))
