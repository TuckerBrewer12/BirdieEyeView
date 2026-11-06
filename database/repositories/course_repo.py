"""CRUD operations for the courses schema (courses, holes, tees, tee_yardages)."""

import asyncpg
from typing import Dict, List, Optional, Tuple
from uuid import UUID

from models import Course, Hole, Tee
from database.connection import write_transaction
from database.converters import course_from_rows, course_to_row, tee_yardages_to_rows, tee_to_row, tee_ratings_to_rows
from database.exceptions import ConflictError, DuplicateError, IntegrityError, NotFoundError


def _tee_yardage_similarity(
    incoming: Dict[int, int],
    existing: Dict[int, int],
    *,
    tolerance_yards: int = 25,
) -> Tuple[float, int]:
    """Return (match_ratio, overlap_holes) for two tee yardage maps."""
    if not incoming or not existing:
        return 0.0, 0
    overlap = sorted(set(incoming.keys()) & set(existing.keys()))
    if not overlap:
        return 0.0, 0
    similar = sum(1 for h in overlap if abs(int(incoming[h]) - int(existing[h])) <= tolerance_yards)
    return similar / len(overlap), len(overlap)


class CourseRepositoryDB:
    """Async CRUD for courses and their child tables."""

    def __init__(self, pool: asyncpg.Pool):
        self._pool = pool

    # ================================================================
    # Private helpers
    # ================================================================

    async def _load_children(self, conn, course_id: UUID) -> tuple:
        """Load holes, tees, and yardages for a course.

        Returns (hole_rows, tee_rows, yardage_map).
        """
        hole_rows = await conn.fetch(
            "SELECT * FROM courses.holes WHERE course_id = $1 ORDER BY hole_number",
            course_id,
        )
        tee_rows = await conn.fetch(
            "SELECT * FROM courses.tees WHERE course_id = $1",
            course_id,
        )
        # Batch-load all yardages for all tees at once (avoid N+1)
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
        """Build a full Course model from a course row + children."""
        hole_rows, tee_rows, yardage_map = await self._load_children(conn, course_row["id"])
        rating_map = {}
        if tee_rows:
            ratings = await conn.fetch(
                "SELECT * FROM courses.tee_ratings WHERE tee_id = ANY($1::uuid[])",
                [tee["id"] for tee in tee_rows],
            )
            for rating in ratings:
                rating_map.setdefault(rating["tee_id"], []).append(rating)
        return course_from_rows(course_row, hole_rows, tee_rows, yardage_map, rating_map)

    async def _write_tee(self, conn, course_id: UUID, tee: Tee) -> None:
        """Replace one explicit tee configuration atomically, preserving its identity."""
        parent = await conn.fetchrow("SELECT id FROM courses.courses WHERE id=$1 FOR NO KEY UPDATE", course_id)
        if not parent:
            raise NotFoundError("Course not found")
        row = await conn.fetchrow(
            """INSERT INTO courses.tees
               (course_id, color, slope_rating, course_rating, yardage_holes, rating_holes, total_yardage)
               VALUES ($1,$2,$3,$4,$5,$6,$7)
               ON CONFLICT (course_id, LOWER(color)) DO UPDATE SET
                   slope_rating = EXCLUDED.slope_rating, course_rating = EXCLUDED.course_rating,
                   yardage_holes = EXCLUDED.yardage_holes, rating_holes = EXCLUDED.rating_holes,
                   total_yardage = EXCLUDED.total_yardage
               RETURNING id""",
            *tee_to_row(tee, course_id),
        )
        tee_id = row["id"]
        await conn.execute("DELETE FROM courses.tee_yardages WHERE tee_id = $1", tee_id)
        yardages = tee_yardages_to_rows(tee, tee_id)
        if yardages:
            await conn.executemany(
                "INSERT INTO courses.tee_yardages (tee_id,hole_number,yardage) VALUES ($1,$2,$3)",
                yardages,
            )
        await conn.execute("DELETE FROM courses.tee_ratings WHERE tee_id = $1", tee_id)
        ratings = tee_ratings_to_rows(tee, tee_id)
        if ratings:
            await conn.executemany(
                """INSERT INTO courses.tee_ratings (tee_id,hole_numbers,course_rating,slope_rating)
                   VALUES ($1,$2,$3,$4)""",
                ratings,
            )

    # ================================================================
    # Read
    # ================================================================

    async def get_course(self, course_id: str, *, connection=None) -> Optional[Course]:
        """Load on the caller's connection when already inside a repository operation."""
        if connection is not None:
            return await self._get_course_on_connection(connection, course_id)
        async with self._pool.acquire() as conn:
            return await self._get_course_on_connection(conn, course_id)

    async def _get_course_on_connection(self, conn, course_id: str) -> Optional[Course]:
        row = await conn.fetchrow(
            "SELECT * FROM courses.courses WHERE id = $1",
            UUID(course_id),
        )
        return await self._assemble(conn, row) if row else None

    async def find_course_by_name(
        self,
        name: str,
        location: Optional[str] = None,
        user_id: Optional[str] = None,
    ) -> Optional[Course]:
        """Fuzzy/case-insensitive course lookup.

        Searches both master courses (user_id IS NULL) and the user's own
        custom courses when user_id is provided.

        Search tiers:
        1. Exact case-insensitive match
        2. ILIKE partial match
        3. Trigram similarity (requires pg_trgm extension)
        """
        async with self._pool.acquire() as conn:
            uid = UUID(user_id) if user_id else None

            # Tier 1: exact (case-insensitive)
            if location and user_id:
                row = await conn.fetchrow(
                    """SELECT * FROM courses.courses c
                       WHERE LOWER(c.name) = LOWER($1) AND LOWER(c.location) = LOWER($2)
                         AND (c.user_id IS NULL OR c.user_id = $3)""",
                    name,
                    location,
                    uid,
                )
            elif location:
                row = await conn.fetchrow(
                    """SELECT * FROM courses.courses c
                       WHERE LOWER(c.name) = LOWER($1) AND LOWER(c.location) = LOWER($2)
                         AND c.user_id IS NULL""",
                    name,
                    location,
                )
            elif user_id:
                row = await conn.fetchrow(
                    """SELECT * FROM courses.courses c
                       WHERE LOWER(c.name) = LOWER($1)
                         AND (c.user_id IS NULL OR c.user_id = $2)""",
                    name,
                    uid,
                )
            else:
                row = await conn.fetchrow(
                    """SELECT * FROM courses.courses c
                       WHERE LOWER(c.name) = LOWER($1) AND c.user_id IS NULL""",
                    name,
                )

            # Tier 2: ILIKE partial
            if not row:
                if location and user_id:
                    row = await conn.fetchrow(
                        """SELECT * FROM courses.courses c
                           WHERE c.name ILIKE $1 AND c.location ILIKE $2
                             AND (c.user_id IS NULL OR c.user_id = $3)
                           LIMIT 1""",
                        f"%{name}%",
                        f"%{location}%",
                        uid,
                    )
                elif location:
                    row = await conn.fetchrow(
                        """SELECT * FROM courses.courses c
                           WHERE c.name ILIKE $1 AND c.location ILIKE $2
                             AND c.user_id IS NULL LIMIT 1""",
                        f"%{name}%",
                        f"%{location}%",
                    )
                elif user_id:
                    row = await conn.fetchrow(
                        """SELECT * FROM courses.courses c
                           WHERE c.name ILIKE $1
                             AND (c.user_id IS NULL OR c.user_id = $2)
                           LIMIT 1""",
                        f"%{name}%",
                        uid,
                    )
                else:
                    row = await conn.fetchrow(
                        """SELECT * FROM courses.courses c
                           WHERE c.name ILIKE $1 AND c.user_id IS NULL LIMIT 1""",
                        f"%{name}%",
                    )

            # Tier 3: trigram similarity (0.4 threshold to avoid false positives)
            if not row:
                if user_id:
                    row = await conn.fetchrow(
                        """SELECT *, similarity(name, $1) AS sim
                           FROM courses.courses
                           WHERE similarity(name, $1) > 0.4
                             AND (user_id IS NULL OR user_id = $2)
                             AND ($3::text IS NULL OR location ILIKE $3)
                           ORDER BY sim DESC LIMIT 1""",
                        name,
                        uid,
                        f"%{location}%" if location else None,
                    )
                else:
                    row = await conn.fetchrow(
                        """SELECT *, similarity(name, $1) AS sim
                           FROM courses.courses
                           WHERE similarity(name, $1) > 0.4 AND user_id IS NULL
                             AND ($2::text IS NULL OR location ILIKE $2)
                           ORDER BY sim DESC LIMIT 1""",
                        name,
                        f"%{location}%" if location else None,
                    )

            if not row:
                return None
            return await self._assemble(conn, row)

    async def find_course_by_external_id(
        self,
        external_course_id: str,
        *,
        user_id: Optional[str] = None,
        connection=None,
    ) -> Optional[Course]:
        """Find a course by provider ID.

        With user_id: searches master plus this user's custom courses.
        Without user_id: searches master courses only.
        """
        if connection is not None:
            return await self._find_course_by_external_id_on(connection, external_course_id, user_id)
        async with self._pool.acquire() as conn:
            return await self._find_course_by_external_id_on(conn, external_course_id, user_id)

    async def _find_course_by_external_id_on(
        self, conn, external_course_id: str, user_id: Optional[str]
    ) -> Optional[Course]:
        if user_id:
            row = await conn.fetchrow(
                """SELECT * FROM courses.courses
                   WHERE external_course_id = $1
                     AND (user_id IS NULL OR user_id = $2)
                   ORDER BY user_id NULLS FIRST
                   LIMIT 1""",
                external_course_id,
                UUID(user_id),
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

    async def find_owned_course_by_exact_name(
        self, name: str, user_id: str, *, connection=None
    ) -> Optional[Course]:
        """The user's own course with exactly this name (case-insensitive); no fuzzy tiers."""
        async def lookup(conn) -> Optional[Course]:
            row = await conn.fetchrow(
                """SELECT * FROM courses.courses
                   WHERE LOWER(name) = LOWER($1) AND user_id = $2
                   ORDER BY created_at, id LIMIT 1""",
                name,
                UUID(user_id),
            )
            return await self._assemble(conn, row) if row else None

        if connection is not None:
            return await lookup(connection)
        async with self._pool.acquire() as conn:
            return await lookup(conn)

    async def find_user_course_by_name(
        self,
        name: str,
        location: Optional[str] = None,
        user_id: str = None,
    ) -> Optional[Course]:
        """Find a course owned by this specific user (excludes masters)."""
        uid = UUID(user_id)
        async with self._pool.acquire() as conn:
            # Tier 1: exact
            if location:
                row = await conn.fetchrow(
                    """SELECT * FROM courses.courses
                       WHERE LOWER(name) = LOWER($1) AND LOWER(location) = LOWER($2)
                         AND user_id = $3""",
                    name,
                    location,
                    uid,
                )
            else:
                row = await conn.fetchrow(
                    """SELECT * FROM courses.courses
                       WHERE LOWER(name) = LOWER($1) AND user_id = $2""",
                    name,
                    uid,
                )
            # Tier 2: ILIKE
            if not row:
                if location:
                    row = await conn.fetchrow(
                        """SELECT * FROM courses.courses
                           WHERE name ILIKE $1 AND location ILIKE $2
                             AND user_id = $3 LIMIT 1""",
                        f"%{name}%",
                        f"%{location}%",
                        uid,
                    )
                else:
                    row = await conn.fetchrow(
                        """SELECT * FROM courses.courses
                           WHERE name ILIKE $1 AND user_id = $2 LIMIT 1""",
                        f"%{name}%",
                        uid,
                    )
            # Tier 3: trigram
            if not row:
                row = await conn.fetchrow(
                    """SELECT *, similarity(name, $1) AS sim
                       FROM courses.courses
                       WHERE similarity(name, $1) > 0.4 AND user_id = $2
                         AND ($3::text IS NULL OR location ILIKE $3)
                       ORDER BY sim DESC LIMIT 1""",
                    name,
                    uid,
                    f"%{location}%" if location else None,
                )
            if not row:
                return None
            return await self._assemble(conn, row)

    async def find_any_user_course_by_name(
        self,
        name: str,
        location: Optional[str] = None,
    ) -> Optional[Course]:
        """Find a course owned by any user (excludes masters). Used for cross-user discovery."""
        async with self._pool.acquire() as conn:
            # Tier 1: exact
            if location:
                row = await conn.fetchrow(
                    """SELECT * FROM courses.courses
                       WHERE LOWER(name) = LOWER($1) AND LOWER(location) = LOWER($2)
                         AND user_id IS NOT NULL LIMIT 1""",
                    name,
                    location,
                )
            else:
                row = await conn.fetchrow(
                    """SELECT * FROM courses.courses
                       WHERE LOWER(name) = LOWER($1) AND user_id IS NOT NULL LIMIT 1""",
                    name,
                )
            # Tier 2: ILIKE
            if not row:
                if location:
                    row = await conn.fetchrow(
                        """SELECT * FROM courses.courses
                           WHERE name ILIKE $1 AND location ILIKE $2
                             AND user_id IS NOT NULL LIMIT 1""",
                        f"%{name}%",
                        f"%{location}%",
                    )
                else:
                    row = await conn.fetchrow(
                        """SELECT * FROM courses.courses
                           WHERE name ILIKE $1 AND user_id IS NOT NULL LIMIT 1""",
                        f"%{name}%",
                    )
            # Tier 3: trigram
            if not row:
                row = await conn.fetchrow(
                    """SELECT *, similarity(name, $1) AS sim
                       FROM courses.courses
                       WHERE similarity(name, $1) > 0.4 AND user_id IS NOT NULL
                         AND ($2::text IS NULL OR location ILIKE $2)
                       ORDER BY sim DESC LIMIT 1""",
                    name,
                    f"%{location}%" if location else None,
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
        *,
        connection=None,
    ) -> None:
        """Fill null fields on an existing course from new scan data.

        Never overwrites existing values — only patches holes where data is missing.
        holes: list of dicts with hole_number, par, handicap keys.
        yardages: {hole_number_str: yardage} dict from scan.
        """
        cid = UUID(course_id)
        normalized_holes = []
        for hole in holes:
            if isinstance(hole, Hole):
                normalized_holes.append(hole)
            else:
                normalized_holes.append(
                    Hole(
                        number=hole.get("hole_number", hole.get("number")),
                        par=hole.get("par"),
                        handicap=hole.get("handicap"),
                    )
                )
        normalized_yardages = Tee(
            slope_rating=slope_rating,
            course_rating=course_rating,
            hole_yardages={key: value for key, value in (yardages or {}).items() if value is not None},
        ).hole_yardages
        async with write_transaction(self._pool, connection) as conn:
            parent = await conn.fetchrow(
                "SELECT id,total_holes FROM courses.courses WHERE id=$1 FOR NO KEY UPDATE", cid
            )
            if not parent:
                raise NotFoundError("Course not found")
            if parent["total_holes"] == 9 and any(hole.number and hole.number > 9 for hole in normalized_holes):
                raise IntegrityError("Hole is outside the declared course layout")
            # Fill hole par/handicap where NULL (or insert if hole row missing)
            for hole in normalized_holes:
                hole_num, par, handicap = hole.number, hole.par, hole.handicap
                if hole_num is None:
                    continue
                if handicap is not None:
                    conflicting_hole_num = await conn.fetchval(
                        """SELECT hole_number FROM courses.holes
                           WHERE course_id = $1 AND handicap = $2 AND hole_number <> $3
                           LIMIT 1""",
                        cid,
                        handicap,
                        hole_num,
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
                    cid,
                    hole_num,
                    par,
                    handicap,
                )
            if any(hole.number is not None and hole.par is not None for hole in normalized_holes):
                # Once observations exist, a stored whole-course par must not reappear after later edits.
                await conn.execute("UPDATE courses.courses SET par=NULL WHERE id=$1", cid)

            # Fill tee rating gaps and insert missing yardages.
            # Parent locking serializes gap fills; conflict clauses retain observed values.
            if tee_color:
                existing_tee = await conn.fetchrow(
                    "SELECT id, slope_rating, course_rating FROM courses.tees "
                    "WHERE course_id = $1 AND LOWER(color) = LOWER($2)",
                    cid,
                    tee_color,
                )
                # If color doesn't match but yardages are mostly the same, map to
                # the existing course tee so we keep one canonical tee name/source.
                if not existing_tee and normalized_yardages:
                    candidate_rows = await conn.fetch(
                        "SELECT id, color, slope_rating, course_rating FROM courses.tees WHERE course_id = $1",
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
                    # Fill NULL slots only — never overwrite existing data
                    updates = {}
                    if slope_rating is not None and existing_tee["slope_rating"] is None:
                        updates["slope_rating"] = slope_rating
                    if course_rating is not None and existing_tee["course_rating"] is None:
                        updates["course_rating"] = course_rating
                    if updates:
                        set_clause = ", ".join(f"{k} = ${i + 2}" for i, k in enumerate(updates))
                        await conn.execute(
                            f"UPDATE courses.tees SET {set_clause} WHERE id = $1",
                            tee_id,
                            *updates.values(),
                        )
                else:
                    # New tee — insert it
                    tee_row = await conn.fetchrow(
                        """INSERT INTO courses.tees (course_id, color, slope_rating, course_rating)
                           VALUES ($1, $2, $3, $4)
                           ON CONFLICT (course_id, LOWER(color)) DO UPDATE SET
                               slope_rating=COALESCE(courses.tees.slope_rating,EXCLUDED.slope_rating),
                               course_rating=COALESCE(courses.tees.course_rating,EXCLUDED.course_rating)
                           RETURNING id""",
                        cid,
                        tee_color,
                        slope_rating,
                        course_rating,
                    )
                    tee_id = tee_row["id"]

                if normalized_yardages:
                    await conn.execute("UPDATE courses.tees SET total_yardage=NULL WHERE id=$1", tee_id)
                    for hole_num, yds in normalized_yardages.items():
                        await conn.execute(
                            """INSERT INTO courses.tee_yardages (tee_id,hole_number,yardage)
                               VALUES ($1,$2,$3) ON CONFLICT (tee_id,hole_number) DO NOTHING""",
                            tee_id,
                            hole_num,
                            yds,
                        )

    async def promote_to_master(self, course_id: str) -> Course:
        """Promote a user-owned course to master by setting user_id = NULL.

        If a master with the same name already exists (race condition), returns the
        course as-is rather than raising.
        """
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
                # Race condition: another master with this name now exists
                row = await conn.fetchrow("SELECT * FROM courses.courses WHERE id = $1", cid)
                return await self._assemble(conn, row)

    async def list_courses(
        self,
        *,
        limit: int = 50,
        offset: int = 0,
        user_id: Optional[str] = None,
    ) -> List[Course]:
        """List courses with pagination (fully populated).

        Returns master courses plus the user's custom courses when user_id provided.
        """
        async with self._pool.acquire() as conn:
            if user_id:
                rows = await conn.fetch(
                    """SELECT * FROM courses.courses
                       WHERE user_id IS NULL OR user_id = $3
                       ORDER BY name LIMIT $1 OFFSET $2""",
                    limit,
                    offset,
                    UUID(user_id),
                )
            else:
                rows = await conn.fetch(
                    """SELECT * FROM courses.courses WHERE user_id IS NULL
                       ORDER BY name LIMIT $1 OFFSET $2""",
                    limit,
                    offset,
                )
            return [await self._assemble(conn, r) for r in rows]

    async def search_courses(self, query: str, *, user_id: Optional[str] = None) -> List[Course]:
        """Search courses by name or location substring: the user's own courses first, then masters."""
        async with self._pool.acquire() as conn:
            if user_id:
                rows = await conn.fetch(
                    """SELECT * FROM courses.courses
                       WHERE (name ILIKE $1 OR location ILIKE $1)
                         AND (user_id IS NULL OR user_id = $2)
                       ORDER BY (user_id IS NULL), name LIMIT 20""",
                    f"%{query}%",
                    UUID(user_id),
                )
            else:
                rows = await conn.fetch(
                    """SELECT * FROM courses.courses
                       WHERE (name ILIKE $1 OR location ILIKE $1)
                         AND user_id IS NULL
                       ORDER BY name LIMIT 20""",
                    f"%{query}%",
                )
            return [await self._assemble(conn, r) for r in rows]

    # ================================================================
    # Create
    # ================================================================

    async def create_course(self, course: Course, *, user_id: Optional[str] = None, connection=None) -> Course:
        """Insert a full Course with holes, tees, and yardages in one transaction.

        user_id=None creates a master/global course.
        user_id=<uuid> creates a custom course owned by that user.
        """
        try:
            colors = [tee.color.casefold() for tee in course.tees if tee.color is not None]
            if len(colors) != len(set(colors)):
                raise DuplicateError("Course tee names must be unique case-insensitively")
            if course.total_holes == 9 and any(hole.number and hole.number > 9 for hole in course.holes):
                raise IntegrityError("Hole is outside the declared course layout")
            uid = UUID(user_id) if user_id else None
            async with write_transaction(self._pool, connection) as conn:
                row_data = course_to_row(course, user_id=uid)
                course_row = await conn.fetchrow(
                    """INSERT INTO courses.courses (name, external_course_id, location, par, total_holes, user_id)
                       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *""",
                    row_data["name"],
                    row_data["external_course_id"],
                    row_data["location"],
                    row_data["par"],
                    row_data["total_holes"],
                    row_data["user_id"],
                )
                course_id = course_row["id"]

                # Batch insert holes
                if course.holes:
                    await conn.executemany(
                        """INSERT INTO courses.holes
                           (course_id, hole_number, par, handicap)
                           VALUES ($1, $2, $3, $4)""",
                        [(course_id, h.number, h.par, h.handicap) for h in course.holes],
                    )

                # Insert tees + yardages
                for tee in course.tees:
                    await self._write_tee(conn, course_id, tee)

                return await self._assemble(conn, course_row)
        except asyncpg.UniqueViolationError as e:
            raise DuplicateError(f"Course already exists: {e}") from e
        except asyncpg.IntegrityConstraintViolationError as e:
            raise IntegrityError(str(e)) from e

    async def clone_course(self, course_id: str, user_id: str) -> Course:
        """Clone a master course as a custom course for a user.

        Copies the course, all its holes, all its tees, and all tee yardages.
        Returns the newly created custom Course.
        """
        UUID(user_id)  # validate the caller-supplied id up front
        async with self._pool.acquire() as conn:
            # Load the source course
            source_row = await conn.fetchrow("SELECT * FROM courses.courses WHERE id = $1", UUID(course_id))
            if not source_row:
                raise NotFoundError(f"Course {course_id} not found")

            if source_row["user_id"] is not None and str(source_row["user_id"]) != user_id:
                raise NotFoundError("Course not found")
            source = await self._assemble(conn, source_row)

        # Build a Course model and create it for the user
        # (uses a fresh connection to avoid nested acquire)
        # Clear id so create_course generates a new one
        source.id = None
        try:
            return await self.create_course(source, user_id=user_id)
        except DuplicateError:
            # User already has a custom course with this name — return it
            existing = await self.find_user_course_by_name(source.name, source.location, user_id=user_id)
            if existing and existing.user_id == user_id:
                return existing
            raise

    # ================================================================
    # Update
    # ================================================================

    async def update_course(self, course_id: str, *, user_id: Optional[str] = None, **fields) -> Optional[Course]:
        """Update top-level course fields.

        When user_id is provided, enforces that the course is owned by that user
        (returns None if it's a master course or belongs to another user).
        """
        allowed = {"name", "external_course_id", "location", "par", "total_holes", "metadata"}
        updates = {k: v for k, v in fields.items() if k in allowed}
        if not updates:
            course = await self.get_course(course_id)
            return course if course and (not user_id or course.user_id == user_id) else None

        try:
            async with self._pool.acquire() as conn, conn.transaction():
                params = [UUID(course_id)]
                scope = "id = $1"
                if user_id:
                    params.append(UUID(user_id))
                    scope += " AND user_id = $2"
                parent = await conn.fetchrow(
                    f"SELECT id FROM courses.courses WHERE {scope} FOR NO KEY UPDATE",
                    *params,
                )
                if parent is None:
                    return None
                if updates.get("total_holes") == 9:
                    outside_layout = await conn.fetchval(
                        "SELECT EXISTS(SELECT 1 FROM courses.holes WHERE course_id=$1 AND hole_number>9)",
                        UUID(course_id),
                    )
                    if outside_layout:
                        raise IntegrityError("Existing holes are outside the requested course layout")

                set_clause = ", ".join(f"{k} = ${i + 2}" for i, k in enumerate(updates))
                values = [UUID(course_id)] + list(updates.values())
                where = "id = $1"
                if user_id:
                    values.append(UUID(user_id))
                    where += f" AND user_id = ${len(values)}"
                row = await conn.fetchrow(
                    f"UPDATE courses.courses SET {set_clause} WHERE {where} RETURNING *",
                    *values,
                )
                return await self._assemble(conn, row)
        except asyncpg.UniqueViolationError as error:
            raise DuplicateError("Conflicting course identity") from error
        except asyncpg.IntegrityConstraintViolationError as error:
            raise IntegrityError("Invalid course metadata or reference") from error

    async def apply_verified_scan(
        self,
        course_id: str,
        holes: List[Hole],
        tees: List[Tee],
        *,
        total_holes: Optional[int] = None,
        connection=None,
    ) -> None:
        """Overwrite a course's hole par/handicap and the given tees with provider-verified scan values.

        Only called after the scan matched the provider exactly; the values written are the scanned
        ones, never provider data. Tees not in the scan are left as they are.
        """
        cid = UUID(course_id)
        numbers = [hole.number for hole in holes if hole.number is not None]
        try:
            async with write_transaction(self._pool, connection) as conn:
                parent = await conn.fetchrow(
                    "SELECT total_holes FROM courses.courses WHERE id=$1 FOR NO KEY UPDATE", cid
                )
                if parent is None:
                    raise NotFoundError("Course not found")
                layout = parent["total_holes"] or total_holes
                if layout == 9 and any(number > 9 for number in numbers):
                    raise IntegrityError("Hole is outside the declared course layout")
                if parent["total_holes"] is None and total_holes is not None:
                    await conn.execute("UPDATE courses.courses SET total_holes=$2 WHERE id=$1", cid, total_holes)
                # Clear handicaps first so reordered stroke indexes don't collide on UNIQUE(course_id, handicap).
                await conn.execute(
                    "UPDATE courses.holes SET handicap=NULL WHERE course_id=$1 AND hole_number = ANY($2::int[])",
                    cid,
                    numbers,
                )
                for hole in holes:
                    if hole.number is None:
                        continue
                    await conn.execute(
                        """INSERT INTO courses.holes (course_id, hole_number, par, handicap)
                           VALUES ($1, $2, $3, $4)
                           ON CONFLICT (course_id, hole_number)
                           DO UPDATE SET par = EXCLUDED.par, handicap = EXCLUDED.handicap""",
                        cid,
                        hole.number,
                        hole.par,
                        hole.handicap,
                    )
                # Hole observations are authoritative; a stored whole-course par must not linger.
                await conn.execute("UPDATE courses.courses SET par=NULL WHERE id=$1", cid)
                for tee in tees:
                    await self._write_tee(conn, cid, tee)
        except asyncpg.UniqueViolationError as error:
            raise DuplicateError("Conflicting course hole or tee identity") from error
        except asyncpg.IntegrityConstraintViolationError as error:
            raise IntegrityError("Invalid verified course data") from error

    async def upsert_hole(self, course_id: str, hole: Hole) -> None:
        """Insert or update a single hole on a course."""
        try:
            async with self._pool.acquire() as conn, conn.transaction():
                parent = await conn.fetchrow(
                    "SELECT total_holes FROM courses.courses WHERE id=$1 FOR NO KEY UPDATE",
                    UUID(course_id),
                )
                if parent is None:
                    raise NotFoundError("Course not found")
                if hole.number is None or (parent["total_holes"] == 9 and hole.number > 9):
                    raise IntegrityError("Hole is unnumbered or outside the declared course layout")
                old_par = await conn.fetchval(
                    "SELECT par FROM courses.holes WHERE course_id=$1 AND hole_number=$2",
                    UUID(course_id),
                    hole.number,
                )
                if old_par is not None or hole.par is not None:
                    await conn.execute("UPDATE courses.courses SET par=NULL WHERE id=$1", UUID(course_id))
                await conn.execute(
                    """INSERT INTO courses.holes (course_id, hole_number, par, handicap)
                       VALUES ($1, $2, $3, $4)
                       ON CONFLICT (course_id, hole_number)
                       DO UPDATE SET par = EXCLUDED.par, handicap = EXCLUDED.handicap""",
                    UUID(course_id),
                    hole.number,
                    hole.par,
                    hole.handicap,
                )
        except asyncpg.UniqueViolationError as error:
            raise DuplicateError("Conflicting course hole identity") from error
        except asyncpg.IntegrityConstraintViolationError as error:
            raise IntegrityError("Invalid course hole or reference") from error

    async def upsert_tee(self, course_id: str, tee: Tee) -> None:
        """Insert or update a tee and its yardages."""
        try:
            async with self._pool.acquire() as conn, conn.transaction():
                await self._write_tee(conn, UUID(course_id), tee)
        except asyncpg.UniqueViolationError as error:
            raise DuplicateError("Conflicting tee rating coverage") from error
        except asyncpg.IntegrityConstraintViolationError as error:
            raise IntegrityError("Invalid course tee or reference") from error

    # ================================================================
    # Delete
    # ================================================================

    async def delete_course(self, course_id: str, *, user_id: Optional[str] = None) -> bool:
        """Delete a course and all children (CASCADE). Returns True if deleted.

        When user_id is provided, only deletes if the course is owned by that user.
        """
        try:
            async with self._pool.acquire() as conn:
                if user_id:
                    result = await conn.execute(
                        "DELETE FROM courses.courses WHERE id = $1 AND user_id = $2",
                        UUID(course_id),
                        UUID(user_id),
                    )
                else:
                    result = await conn.execute("DELETE FROM courses.courses WHERE id = $1", UUID(course_id))
                return result == "DELETE 1"
        except asyncpg.ForeignKeyViolationError as error:
            raise ConflictError("Course is referenced by saved records") from error
