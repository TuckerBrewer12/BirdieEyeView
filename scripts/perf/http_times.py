import asyncio
import os
import statistics
import sys
import time

import asyncpg
import httpx

BASE_API = os.environ.get("BASE_API", "http://127.0.0.1:8100")
PR_API = os.environ.get("PR_API", "http://127.0.0.1:8200")
DB_PORT = int(os.environ.get("DB_PORT", "5432"))
N = int(os.environ.get("N", "21"))


async def db_round_trip_ms() -> float:
    connection = await asyncpg.connect(host="127.0.0.1", port=DB_PORT, user="postgres", database=os.environ.get("PGDATABASE", "bev"))
    samples = []
    for _ in range(50):
        start = time.perf_counter()
        await connection.fetchval("select 1")
        samples.append((time.perf_counter() - start) * 1000)
    await connection.close()
    return statistics.median(samples)


async def main(paths: list[str]) -> None:
    async with httpx.AsyncClient(timeout=120, headers={"User-Agent": "birdie-perf"}) as client:
        login = await client.post(f"{BASE_API}/api/auth/login", json={"email": "scheffler@example.com", "password": "bench-password-123"})
        user = login.json()["user_id"]
        headers = {"Authorization": f"Bearer {login.json()['access_token']}"}
        rounds = await client.get(f"{BASE_API}/api/rounds/user/{user}?limit=1", headers=headers)
        names = {"user": user, "round": rounds.json()[0]["id"]}
        round_trip = await db_round_trip_ms()
        for path in paths:
            url = path.format(**names)
            times = {BASE_API: [], PR_API: []}
            for api in times:
                await client.get(f"{api}/api/{url}", headers=headers)
            for i in range(N):
                for api in (BASE_API, PR_API) if i % 2 == 0 else (PR_API, BASE_API):
                    start = time.perf_counter()
                    reply = await client.get(f"{api}/api/{url}", headers=headers)
                    reply.raise_for_status()
                    times[api].append((time.perf_counter() - start) * 1000)
            base, pr = statistics.median(times[BASE_API]), statistics.median(times[PR_API])
            print(f"| `GET /api/{path}` | {round_trip:.1f} ms | {base:.0f} | **{pr:.0f}** ({(pr - base) / base * 100:+.0f}%) |")


if __name__ == "__main__":
    asyncio.run(main(sys.argv[1:]))
