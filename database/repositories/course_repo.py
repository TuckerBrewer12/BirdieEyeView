import asyncpg
from typing import Dict, List, Optional, Tuple
from uuid import UUID

from models import Course, Hole, Tee
from models.course import CourseSummary
from database.converters import course_from_rows, course_to_row, tee_yardages_to_rows
from database.exceptions import DuplicateError, IntegrityError, NotFoundError


def _tee_yardage_similarity(
    incoming: Dict[int, int],
    existing: Dict[int, int],
    *,
    tolerance_yards: int = 25,
) -> Tuple[float, int]:
    if not incoming or not existing:
        return 0.0, 0
    overlap = sorted(set(incoming.keys()) & set(existing.keys()))
    if not overlap:
        return 0.0, 0
    similar = sum(1 for h in overlap if abs(int(incoming[h]) - int(existing[h])) <= tolerance_yards)
    return similar / len(overlap), len(overlap)


def _summary_from_row(row) -> CourseSummary:
    return CourseSummary(
        id=str(row["id"]),
        name=row["name"],
        external_course_id=row["external_course_id"],
        location=row["location"],
        par=row["par"],
        hole_count=row["hole_count"],
        tee_count=row["tee_count"],
    )


class CourseRepositoryDB:
    def __init__(self, pool: asyncpg.Pool):
        self._pool = pool

    async def _load_children(self, conn, course_id: UUID) -> tuple:
        hole_rows = await conn.fetch(
            "SELECT * FROM courses.holes WHERE course_id = $1 ORDER BY hole_number",
            course_id,
        )
        tee_rows = await conn.fetch(
            "SELECT * FROM courses.tees WHERE course_id = $1",
            course_id,
        )
        tee_ids = [r["id"] for r in tee_rows]
        if tee_ids:
            yardage_rows = await conn.fetch(
                "SELECT * FROM courses.tee_yardages WHERE tee_id = ANY($1::uuid[]) ORDER BY hole_number",
                tee_ids,
            )
        else:
            yardage_rows = []

        yardage_map: Dict[UUID, list] = {}
        for yr in yardage_rows:
            yardage_map.setdefault(yr["tee_id"], []).append(yr)

        return hole_rows, tee_rows, yardage_map

    async def _assemble(self, conn, course_row) -> Course:
        hole_rows, tee_rows, yardage_map = await self._load_children(
            conn, course_row["id"]
        )
        return course_from_rows(course_row, hole_rows, tee_rows, yardage_map)

    async def get_course(self, course_id: str) -> Optional[Course]:
        async with self._pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT * FROM courses.courses WHERE id = $1",
                UUID(course_id),
            )
            if not row:
                return None
            return await self._assemble(conn, row)

    async def find_course_by_name(
        self,
        name: str,
        location: Optional[str] = None,
        user_id: Optional[str] = None,
    ) -> Optional[Course]:
        async with self._pool.acquire() as conn:
            if user_id:
                uid = UUID(user_id)
                user_filter = "(c.user_id IS NULL OR c.user_id = $3)"
            else:
                uid = None
                user_filter = "c.user_id IS NULL"

            def make_query(where_name: str, where_loc: str = "") -> str:
                loc_part = f" AND {where_loc}" if where_loc else ""
                user_part = f" AND {user_filter}"
                return f"SELECT * FROM courses.courses c WHERE {where_name}{loc_part}{user_part}"

            if location and user_id:
                row = await conn.fetchrow(
                    """SELECT * FROM courses.courses c
                       WHERE LOWER(c.name) = LOWER($1) AND LOWER(c.location) = LOWER($2)
                         AND (c.user_id IS NULL OR c.user_id = $3)""",
                    name, location, uid,
                )
            elif location:
                row = await conn.fetchrow(
                    """SELECT * FROM courses.courses c
                       WHERE LOWER(c.name) = LOWER($1) AND LOWER(c.location) = LOWER($2)
                         AND c.user_id IS NULL""",
                    name, location,
                )
            elif user_id:
                row = await conn.fetchrow(
                    """SELECT * FROM courses.courses c
                       WHERE LOWER(c.name) = LOWER($1)
                         AND (c.user_id IS NULL OR c.user_id = $2)""",
                    name, uid,
                )
            else:
                row = await conn.fetchrow(
                    """SELECT * FROM courses.courses c
                       WHERE LOWER(c.name) = LOWER($1) AND c.user_id IS NULL""",
                    name,
                )

            if not row:
                if location and user_id:
                    row = await conn.fetchrow(
                        """SELECT * FROM courses.courses c
                           WHERE c.name ILIKE $1 AND c.location ILIKE $2
                             AND (c.user_id IS NULL OR c.user_id = $3)
                           LIMIT 1""",
                        f"%{name}%", f"%{location}%", uid,
                    )
                elif location:
                    row = await conn.fetchrow(
                        """SELECT * FROM courses.courses c
                           WHERE c.name ILIKE $1 AND c.location ILIKE $2
                             AND c.user_id IS NULL LIMIT 1""",
                        f"%{name}%", f"%{location}%",
                    )
                elif user_id:
                    row = await conn.fetchrow(
                        """SELECT * FROM courses.courses c
                           WHERE c.name ILIKE $1
                             AND (c.user_id IS NULL OR c.user_id = $2)
                           LIMIT 1""",
                        f"%{name}%", uid,
                    )
                else:
                    row = await conn.fetchrow(
                        """SELECT * FROM courses.courses c
                           WHERE c.name ILIKE $1 AND c.user_id IS NULL LIMIT 1""",
                        f"%{name}%",
                    )

            # `name % $1` (pg_trgm's 0.3 default threshold) lets the trigram index
            # find candidates; similarity() > 0.4 then keeps the close ones.
            if not row:
                if user_id:
                    row = await conn.fetchrow(
                        """SELECT *, similarity(name, $1) AS sim
                           FROM courses.courses
                           WHERE name % $1 AND similarity(name, $1) > 0.4
                             AND (user_id IS NULL OR user_id = $2)
                           ORDER BY sim DESC LIMIT 1""",
                        name, uid,
                    )
                else:
                    row = await conn.fetchrow(
                        """SELECT *, similarity(name, $1) AS sim
                           FROM courses.courses
                           WHERE name % $1 AND similarity(name, $1) > 0.4 AND user_id IS NULL
                           ORDER BY sim DESC LIMIT 1""",
                        name,
                    )

            if not row:
                return None
            return await self._assemble(conn, row)

    async def find_course_by_external_id(
        self,
        external_course_id: str,
        *,
        user_id: Optional[str] = None,
    ) -> Optional[Course]:
        async with self._pool.acquire() as conn:
            if user_id:
                row = await conn.fetchrow(
                    """SELECT * FROM courses.courses
                       WHERE external_course_id = $1
                         AND (user_id IS NULL OR user_id = $2)
                       ORDER BY user_id NULLS FIRST
                       LIMIT 1""",
                    external_course_id, UUID(user_id),
                )
            else:
                row = await conn.fetchrow(
                    """SELECT * FROM courses.courses
                       WHERE external_course_id = $1
                         AND user_id IS NULL
                       LIMIT 1""",
                    external_course_id,
                )
            if not row:
                return None
            return await self._assemble(conn, row)

    async def find_user_course_by_name(
        self,
        name: str,
        location: Optional[str] = None,
        user_id: str = None,
    ) -> Optional[Course]:
        uid = UUID(user_id)
        async with self._pool.acquire() as conn:
            if location:
                row = await conn.fetchrow(
                    """SELECT * FROM courses.courses
                       WHERE LOWER(name) = LOWER($1) AND LOWER(location) = LOWER($2)
                         AND user_id = $3""",
                    name, location, uid,
                )
            else:
                row = await conn.fetchrow(
                    """SELECT * FROM courses.courses
                       WHERE LOWER(name) = LOWER($1) AND user_id = $2""",
                    name, uid,
                )
            if not row:
                if location:
                    row = await conn.fetchrow(
                        """SELECT * FROM courses.courses
                           WHERE name ILIKE $1 AND location ILIKE $2
                             AND user_id = $3 LIMIT 1""",
                        f"%{name}%", f"%{location}%", uid,
                    )
                else:
                    row = await conn.fetchrow(
                        """SELECT * FROM courses.courses
                           WHERE name ILIKE $1 AND user_id = $2 LIMIT 1""",
                        f"%{name}%", uid,
                    )
            if not row:
                row = await conn.fetchrow(
                    """SELECT *, similarity(name, $1) AS sim
                       FROM courses.courses
                       WHERE name % $1 AND similarity(name, $1) > 0.4 AND user_id = $2
                       ORDER BY sim DESC LIMIT 1""",
                    name, uid,
                )
            if not row:
                return None
            return await self._assemble(conn, row)

    async def find_any_user_course_by_name(
        self,
        name: str,
        location: Optional[str] = None,
    ) -> Optional[Course]:
        async with self._pool.acquire() as conn:
            if location:
                row = await conn.fetchrow(
                    """SELECT * FROM courses.courses
                       WHERE LOWER(name) = LOWER($1) AND LOWER(location) = LOWER($2)
                         AND user_id IS NOT NULL LIMIT 1""",
                    name, location,
                )
            else:
                row = await conn.fetchrow(
                    """SELECT * FROM courses.courses
                       WHERE LOWER(name) = LOWER($1) AND user_id IS NOT NULL LIMIT 1""",
                    name,
                )
            if not row:
                if location:
                    row = await conn.fetchrow(
                        """SELECT * FROM courses.courses
                           WHERE name ILIKE $1 AND location ILIKE $2
                             AND user_id IS NOT NULL LIMIT 1""",
                        f"%{name}%", f"%{location}%",
                    )
                else:
                    row = await conn.fetchrow(
                        """SELECT * FROM courses.courses
                           WHERE name ILIKE $1 AND user_id IS NOT NULL LIMIT 1""",
                        f"%{name}%",
                    )
            if not row:
                row = await conn.fetchrow(
                    """SELECT *, similarity(name, $1) AS sim
                       FROM courses.courses
                       WHERE name % $1 AND similarity(name, $1) > 0.4 AND user_id IS NOT NULL
                       ORDER BY sim DESC LIMIT 1""",
                    name,
                )
            if not row:
                return None
            return await self._assemble(conn, row)

    async def fill_course_gaps(
        self,
        course_id: str,
        holes: list,
        tee_color: Optional[str] = None,
        slope_rating: Optional[float] = None,
        course_rating: Optional[float] = None,
        yardages: Optional[dict] = None,
    ) -> None:
        cid = UUID(course_id)
        async with self._pool.acquire() as conn:
            async with conn.transaction():
                for hole in holes:
                    h = hole if isinstance(hole, dict) else hole.__dict__
                    hole_num = h.get("hole_number")
                    par = h.get("par")
                    handicap = h.get("handicap")
                    if hole_num is None:
                        continue
                    if handicap is not None:
                        conflicting_hole_num = await conn.fetchval(
                            """SELECT hole_number FROM courses.holes
                               WHERE course_id = $1 AND handicap = $2 AND hole_number <> $3
                               LIMIT 1""",
                            cid, handicap, hole_num,
                        )
                        if conflicting_hole_num is not None:
                            handicap = None
                    await conn.execute(
                        """INSERT INTO courses.holes (course_id, hole_number, par, handicap)
                           VALUES ($1, $2, $3, $4)
                           ON CONFLICT (course_id, hole_number) DO UPDATE SET
                               par = CASE WHEN courses.holes.par IS NULL
                                         THEN EXCLUDED.par ELSE courses.holes.par END,
                               handicap = CASE WHEN courses.holes.handicap IS NULL
                                              THEN EXCLUDED.handicap ELSE courses.holes.handicap END""",
                        cid, hole_num, par, handicap,
                    )

                if tee_color:
                    normalized_yardages: Dict[int, int] = {}
                    for hole_num_str, yardage in (yardages or {}).items():
                        if yardage is None:
                            continue
                        normalized_yardages[int(hole_num_str)] = int(yardage)

                    existing_tee = await conn.fetchrow(
                        "SELECT id, slope_rating, course_rating FROM courses.tees "
                        "WHERE course_id = $1 AND LOWER(color) = LOWER($2)",
                        cid, tee_color,
                    )
                    if not existing_tee and normalized_yardages:
                        candidate_rows = await conn.fetch(
                            "SELECT id, color, slope_rating, course_rating "
                            "FROM courses.tees WHERE course_id = $1",
                            cid,
                        )
                        if candidate_rows:
                            candidate_ids = [r["id"] for r in candidate_rows]
                            y_rows = await conn.fetch(
                                "SELECT tee_id, hole_number, yardage FROM courses.tee_yardages "
                                "WHERE tee_id = ANY($1::uuid[])",
                                candidate_ids,
                            )
                            yards_by_tee: Dict[UUID, Dict[int, int]] = {}
                            for row in y_rows:
                                tee_id = row["tee_id"]
                                yards_by_tee.setdefault(tee_id, {})[int(row["hole_number"])] = int(row["yardage"])

                            best_match = None
                            best_ratio = 0.0
                            best_overlap = 0
                            for candidate in candidate_rows:
                                ratio, overlap = _tee_yardage_similarity(
                                    normalized_yardages,
                                    yards_by_tee.get(candidate["id"], {}),
                                )
                                if ratio > best_ratio or (ratio == best_ratio and overlap > best_overlap):
                                    best_match = candidate
                                    best_ratio = ratio
                                    best_overlap = overlap
                            if best_match and best_overlap >= 6 and best_ratio >= 0.7:
                                existing_tee = best_match

                    if existing_tee:
                        tee_id = existing_tee["id"]
                        updates = {}
                        if slope_rating is not None and existing_tee["slope_rating"] is None:
                            updates["slope_rating"] = slope_rating
                        if course_rating is not None and existing_tee["course_rating"] is None:
                            updates["course_rating"] = course_rating
                        if updates:
                            set_clause = ", ".join(
                                f"{k} = ${i + 2}" for i, k in enumerate(updates)
                            )
                            await conn.execute(
                                f"UPDATE courses.tees SET {set_clause} WHERE id = $1",
                                tee_id, *updates.values(),
                            )
                    else:
                        tee_row = await conn.fetchrow(
                            """INSERT INTO courses.tees (course_id, color, slope_rating, course_rating)
                               VALUES ($1, $2, $3, $4) RETURNING id""",
                            cid, tee_color, slope_rating, course_rating,
                        )
                        tee_id = tee_row["id"]

                    if normalized_yardages:
                        for hole_num, yds in normalized_yardages.items():
                            exists = await conn.fetchval(
                                "SELECT 1 FROM courses.tee_yardages "
                                "WHERE tee_id = $1 AND hole_number = $2",
                                tee_id, hole_num,
                            )
                            if not exists:
                                await conn.execute(
                                    """INSERT INTO courses.tee_yardages (tee_id, hole_number, yardage)
                                       VALUES ($1, $2, $3)""",
                                    tee_id, hole_num, yds,
                                )

    async def promote_to_master(self, course_id: str) -> Course:
        cid = UUID(course_id)
        async with self._pool.acquire() as conn:
            try:
                row = await conn.fetchrow(
                    "UPDATE courses.courses SET user_id = NULL WHERE id = $1 RETURNING *",
                    cid,
                )
                if not row:
                    raise NotFoundError(f"Course {course_id} not found")
                return await self._assemble(conn, row)
            except asyncpg.UniqueViolationError:
                row = await conn.fetchrow(
                    "SELECT * FROM courses.courses WHERE id = $1", cid
                )
                return await self._assemble(conn, row)

    async def list_course_summaries(
        self,
        *,
        limit: int = 50,
        offset: int = 0,
        user_id: Optional[str] = None,
    ) -> List[CourseSummary]:
        uid = UUID(user_id) if user_id else None
        async with self._pool.acquire() as conn:
            rows = await conn.fetch(
                """SELECT c.id, c.name, c.external_course_id, c.location,
                          COALESCE(c.par, (
                              SELECT SUM(h.par) FROM courses.holes h WHERE h.course_id = c.id
                              HAVING COUNT(*) = 18 AND COUNT(h.par) = 18
                          )) AS par,
                          (SELECT COUNT(*) FROM courses.holes h WHERE h.course_id = c.id) AS hole_count,
                          (SELECT COUNT(*) FROM courses.tees t WHERE t.course_id = c.id) AS tee_count
                   FROM (
                       SELECT * FROM courses.courses
                       WHERE user_id IS NULL OR user_id = $3
                       ORDER BY name LIMIT $1 OFFSET $2
                   ) c
                   ORDER BY c.name""",
                limit, offset, uid,
            )
            return [_summary_from_row(r) for r in rows]

    async def search_course_summaries(
        self, query: str, *, user_id: Optional[str] = None
    ) -> List[CourseSummary]:
        uid = UUID(user_id) if user_id else None
        async with self._pool.acquire() as conn:
            rows = await conn.fetch(
                """SELECT c.id, c.name, c.external_course_id, c.location,
                          COALESCE(c.par, (
                              SELECT SUM(h.par) FROM courses.holes h WHERE h.course_id = c.id
                              HAVING COUNT(*) = 18 AND COUNT(h.par) = 18
                          )) AS par,
                          (SELECT COUNT(*) FROM courses.holes h WHERE h.course_id = c.id) AS hole_count,
                          (SELECT COUNT(*) FROM courses.tees t WHERE t.course_id = c.id) AS tee_count
                   FROM (
                       SELECT * FROM courses.courses
                       WHERE (name ILIKE $1 OR location ILIKE $1)
                         AND (user_id IS NULL OR user_id = $2)
                       ORDER BY name LIMIT 20
                   ) c
                   ORDER BY c.name""",
                f"%{query}%", uid,
            )
            return [_summary_from_row(r) for r in rows]

    async def create_course(
        self, course: Course, *, user_id: Optional[str] = None
    ) -> Course:
        try:
            uid = UUID(user_id) if user_id else None
            async with self._pool.acquire() as conn:
                async with conn.transaction():
                    row_data = course_to_row(course, user_id=uid)
                    course_row = await conn.fetchrow(
                        """INSERT INTO courses.courses (name, external_course_id, location, par, total_holes, user_id)
                           VALUES ($1, $2, $3, $4, $5, $6) RETURNING *""",
                        row_data["name"], row_data["external_course_id"], row_data["location"],
                        row_data["par"], row_data["total_holes"], row_data["user_id"],
                    )
                    course_id = course_row["id"]

                    if course.holes:
                        await conn.executemany(
                            """INSERT INTO courses.holes
                               (course_id, hole_number, par, handicap)
                               VALUES ($1, $2, $3, $4)""",
                            [(course_id, h.number, h.par, h.handicap) for h in course.holes],
                        )

                    for tee in course.tees:
                        tee_row = await conn.fetchrow(
                            """INSERT INTO courses.tees
                               (course_id, color, slope_rating, course_rating)
                               VALUES ($1, $2, $3, $4) RETURNING id""",
                            course_id, tee.color, tee.slope_rating, tee.course_rating,
                        )
                        tee_id = tee_row["id"]

                        yardage_tuples = tee_yardages_to_rows(tee, tee_id)
                        if yardage_tuples:
                            await conn.executemany(
                                """INSERT INTO courses.tee_yardages
                                   (tee_id, hole_number, yardage)
                                   VALUES ($1, $2, $3)""",
                                yardage_tuples,
                            )

                    return await self._assemble(conn, course_row)
        except asyncpg.UniqueViolationError as e:
            raise DuplicateError(f"Course already exists: {e}") from e
        except asyncpg.ForeignKeyViolationError as e:
            raise IntegrityError(str(e)) from e

    async def clone_course(self, course_id: str, user_id: str) -> Course:
        UUID(user_id)
        async with self._pool.acquire() as conn:
            source_row = await conn.fetchrow(
                "SELECT * FROM courses.courses WHERE id = $1", UUID(course_id)
            )
            if not source_row:
                raise NotFoundError(f"Course {course_id} not found")

            hole_rows, tee_rows, yardage_map = await self._load_children(
                conn, source_row["id"]
            )

        source = course_from_rows(source_row, hole_rows, tee_rows, yardage_map)
        source.id = None
        try:
            return await self.create_course(source, user_id=user_id)
        except DuplicateError:
            existing = await self.find_course_by_name(
                source.name, source.location, user_id=user_id
            )
            if existing and existing.user_id == user_id:
                return existing
            raise

    async def update_course(
        self, course_id: str, *, user_id: Optional[str] = None, **fields
    ) -> Optional[Course]:
        allowed = {"name", "external_course_id", "location", "par", "total_holes", "metadata"}
        updates = {k: v for k, v in fields.items() if k in allowed}
        if not updates:
            return await self.get_course(course_id)

        async with self._pool.acquire() as conn:
            if user_id:
                row = await conn.fetchrow(
                    "SELECT user_id FROM courses.courses WHERE id = $1",
                    UUID(course_id),
                )
                if not row or str(row["user_id"]) != user_id:
                    return None

            set_clause = ", ".join(f"{k} = ${i+2}" for i, k in enumerate(updates))
            values = [UUID(course_id)] + list(updates.values())

            row = await conn.fetchrow(
                f"UPDATE courses.courses SET {set_clause} WHERE id = $1 RETURNING *",
                *values,
            )
            if not row:
                return None
            return await self._assemble(conn, row)

    async def upsert_hole(self, course_id: str, hole: Hole) -> None:
        async with self._pool.acquire() as conn:
            await conn.execute(
                """INSERT INTO courses.holes (course_id, hole_number, par, handicap)
                   VALUES ($1, $2, $3, $4)
                   ON CONFLICT (course_id, hole_number)
                   DO UPDATE SET par = EXCLUDED.par, handicap = EXCLUDED.handicap""",
                UUID(course_id), hole.number, hole.par, hole.handicap,
            )

    async def upsert_tee(self, course_id: str, tee: Tee) -> None:
        async with self._pool.acquire() as conn:
            async with conn.transaction():
                cid = UUID(course_id)
                existing_tee = await conn.fetchrow(
                    """SELECT id FROM courses.tees
                       WHERE course_id = $1 AND LOWER(color) = LOWER($2)""",
                    cid, tee.color,
                )
                if existing_tee:
                    tee_id = existing_tee["id"]
                    await conn.execute(
                        """UPDATE courses.tees
                           SET slope_rating = $2, course_rating = $3
                           WHERE id = $1""",
                        tee_id, tee.slope_rating, tee.course_rating,
                    )
                else:
                    tee_row = await conn.fetchrow(
                        """INSERT INTO courses.tees
                           (course_id, color, slope_rating, course_rating)
                           VALUES ($1, $2, $3, $4) RETURNING id""",
                        cid, tee.color, tee.slope_rating, tee.course_rating,
                    )
                    tee_id = tee_row["id"]

                await conn.execute(
                    "DELETE FROM courses.tee_yardages WHERE tee_id = $1", tee_id
                )
                yardage_tuples = tee_yardages_to_rows(tee, tee_id)
                if yardage_tuples:
                    await conn.executemany(
                        """INSERT INTO courses.tee_yardages
                           (tee_id, hole_number, yardage)
                           VALUES ($1, $2, $3)""",
                        yardage_tuples,
                    )

    async def delete_course(
        self, course_id: str, *, user_id: Optional[str] = None
    ) -> bool:
        async with self._pool.acquire() as conn:
            if user_id:
                result = await conn.execute(
                    "DELETE FROM courses.courses WHERE id = $1 AND user_id = $2",
                    UUID(course_id), UUID(user_id),
                )
            else:
                result = await conn.execute(
                    "DELETE FROM courses.courses WHERE id = $1", UUID(course_id)
                )
            return result == "DELETE 1"
