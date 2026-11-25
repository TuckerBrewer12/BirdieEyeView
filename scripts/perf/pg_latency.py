# Usage: python scripts/perf/pg_latency.py LISTEN_PORT POSTGRES_PORT ONE_WAY_MS
# A TCP proxy in front of Postgres that holds every chunk ONE_WAY_MS in each direction, so a round trip
# costs about twice that. Point an API's DATABASE_URL at LISTEN_PORT.
import asyncio
import sys
import time

LISTEN_PORT, POSTGRES_PORT, ONE_WAY_MS = int(sys.argv[1]), int(sys.argv[2]), float(sys.argv[3])


async def delayed_copy(reader: asyncio.StreamReader, writer: asyncio.StreamWriter) -> None:
    queue: asyncio.Queue = asyncio.Queue()

    async def send() -> None:
        while (item := await queue.get())[1] is not None:
            due, chunk = item
            await asyncio.sleep(max(0.0, due - time.monotonic()))
            writer.write(chunk)
            await writer.drain()
        writer.close()

    sender = asyncio.create_task(send())
    while chunk := await reader.read(65536):
        queue.put_nowait((time.monotonic() + ONE_WAY_MS / 1000, chunk))
    queue.put_nowait((0.0, None))
    await sender


async def connect(client_reader: asyncio.StreamReader, client_writer: asyncio.StreamWriter) -> None:
    server_reader, server_writer = await asyncio.open_connection("127.0.0.1", POSTGRES_PORT)
    await asyncio.gather(
        delayed_copy(client_reader, server_writer),
        delayed_copy(server_reader, client_writer),
        return_exceptions=True,
    )


async def main() -> None:
    server = await asyncio.start_server(connect, "127.0.0.1", LISTEN_PORT)
    async with server:
        await server.serve_forever()


if __name__ == "__main__":
    asyncio.run(main())
