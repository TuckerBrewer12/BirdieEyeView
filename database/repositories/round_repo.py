"""CRUD operations for rounds, hole_scores, and scorecard_scans."""

import asyncpg
import json
from collections import defaultdict
from datetime import date
from typing import List, Optional
from uuid import UUID

from pydantic import ValidationError

from models import HoleScore, Round
from database.converters import round_from_rows, round_to_row, hole_score_to_row, user_tee_from_row, course_from_rows
from database.connection import write_transaction
from database.exceptions import DuplicateError, IntegrityError, NotFoundError
from database.repositories.course_repo import CourseRepositoryDB


class RoundRepositoryDB:
    """Async CRUD for rounds and their child tables."""

    def __init__(self, pool: asyncpg.Pool, course_repo: CourseRepositoryDB):
        self._pool = pool
        self._course_repo = course_repo

    # ================================================================
    # Private helpers
    # ================================================================

    async def _validate_references(self, conn, user_id, course_id, tee_id, user_tee_id):
        """Check related identities together; individual FKs only establish existence."""
        course = None
        if course_id is not None:
            course = await conn.fetchrow(
                "SELECT id,user_id,total_holes FROM courses.courses WHERE id = $1 FOR SHARE",
                course_id,
            )
            if not course or (course["user_id"] is not None and course["user_id"] != user_id):
                raise IntegrityError("Round course is missing or inaccessible")
        if tee_id is not None:
            tee = await conn.fetchrow("SELECT course_id FROM courses.tees WHERE id = $1 FOR KEY SHARE", tee_id)
            if not tee or course_id is None or tee["course_id"] != course_id:
                raise IntegrityError("Played tee does not belong to the round course")
        if user_tee_id is not None:
            tee = await conn.fetchrow(
                "SELECT user_id,course_id FROM users.user_tees WHERE id = $1 FOR KEY SHARE",
                user_tee_id,
            )
            if not tee or tee["user_id"] != user_id or (tee["course_id"] is not None and tee["course_id"] != course_id):
                raise IntegrityError("Custom tee is missing, inaccessible or belongs to another course")
        return course

    async def _resolve_tee_color(self, conn, tee_id: UUID) -> Optional[str]:
        """Look up tee color from tee_id."""
        if not tee_id:
            return None
        row = await conn.fetchrow("SELECT color FROM courses.tees WHERE id = $1", tee_id)
        return row["color"] if row else None

    async def _resolve_tee_id(self, conn, course_id: UUID, tee_color: str) -> Optional[UUID]:
        """Look up tee_id from course + color."""
        row = await conn.fetchrow(
            """SELECT id FROM courses.tees
               WHERE course_id = $1 AND LOWER(color) = LOWER($2)""",
            course_id,
            tee_color,
        )
        return row["id"] if row else None

    async def _load_hole_id_map(self, conn, course_id: UUID) -> dict:
        """Map hole_number -> hole UUID for a course."""
        rows = await conn.fetch(
            "SELECT id, hole_number FROM courses.holes WHERE course_id = $1",
            course_id,
        )
        return {r["hole_number"]: r["id"] for r in rows}

    async def _assemble_round(self, conn, round_row) -> Round:
        """Build a full Round model from a round row."""
        # Load hole scores
        score_rows = await conn.fetch(
            """SELECT * FROM users.hole_scores
               WHERE round_id = $1 ORDER BY hole_number""",
            round_row["id"],
        )

        # Load course if available
        course = None
        if round_row["course_id"]:
            course = await self._course_repo.get_course(str(round_row["course_id"]), connection=conn)

        # Resolve tee color — prefer the stored text (editable), fall back to FK lookup
        tee_color = round_row["tee_box_played"]
        if not tee_color:
            tee_color = await self._resolve_tee_color(conn, round_row["tee_id"])

        # Load user_tee if present
        user_tee = None
        if round_row["user_tee_id"]:
            ut_row = await conn.fetchrow(
                "SELECT * FROM users.user_tees WHERE id = $1",
                round_row["user_tee_id"],
            )
            if ut_row:
                ratings = await conn.fetch("SELECT * FROM users.user_tee_ratings WHERE tee_id = $1", ut_row["id"])
                user_tee = user_tee_from_row(ut_row, ratings)

        return round_from_rows(round_row, score_rows, course, tee_color, user_tee)

    async def _get_rounds_bulk(self, conn, round_rows) -> List[Round]:
        """Assemble rounds with batched child reads, independent of round count."""
        if not round_rows:
            return []

        round_ids = [r["id"] for r in round_rows]
        course_ids = list({r["course_id"] for r in round_rows if r["course_id"]})
        ut_ids = list({r["user_tee_id"] for r in round_rows if r["user_tee_id"]})
        tee_id_lookup = list({r["tee_id"] for r in round_rows if not r["tee_box_played"] and r["tee_id"]})

        # Query 1: all hole scores
        score_rows = await conn.fetch(
            "SELECT * FROM users.hole_scores WHERE round_id = ANY($1::uuid[]) ORDER BY hole_number",
            round_ids,
        )
        scores_by_round: dict = defaultdict(list)
        for s in score_rows:
            scores_by_round[str(s["round_id"])].append(s)

        # Queries 2–5: courses (deduplicated)
        courses_by_id: dict = {}
        if course_ids:
            c_rows = await conn.fetch("SELECT * FROM courses.courses WHERE id = ANY($1::uuid[])", course_ids)
            h_rows = await conn.fetch(
                "SELECT * FROM courses.holes WHERE course_id = ANY($1::uuid[]) ORDER BY hole_number", course_ids
            )
            t_rows = await conn.fetch("SELECT * FROM courses.tees WHERE course_id = ANY($1::uuid[])", course_ids)
            tee_ids = [t["id"] for t in t_rows]
            y_rows = (
                await conn.fetch("SELECT * FROM courses.tee_yardages WHERE tee_id = ANY($1::uuid[])", tee_ids)
                if tee_ids
                else []
            )
            rating_rows = (
                await conn.fetch(
                    "SELECT * FROM courses.tee_ratings WHERE tee_id = ANY($1::uuid[])",
                    tee_ids,
                )
                if tee_ids
                else []
            )
            ratings_by_tee = defaultdict(list)
            for rating in rating_rows:
                ratings_by_tee[rating["tee_id"]].append(rating)

            holes_by_course: dict = defaultdict(list)
            for h in h_rows:
                holes_by_course[str(h["course_id"])].append(h)
            tees_by_course: dict = defaultdict(list)
            for t in t_rows:
                tees_by_course[str(t["course_id"])].append(t)
            yardages_by_tee: dict = defaultdict(list)
            for y in y_rows:
                yardages_by_tee[str(y["tee_id"])].append(y)

            for c_row in c_rows:
                cid = str(c_row["id"])
                ctees = tees_by_course[cid]
                courses_by_id[cid] = course_from_rows(
                    c_row,
                    holes_by_course[cid],
                    ctees,
                    {t["id"]: yardages_by_tee[str(t["id"])] for t in ctees},
                    ratings_by_tee,
                )

        # Query 6: user_tees
        user_tees_by_id: dict = {}
        if ut_ids:
            ut_rows = await conn.fetch("SELECT * FROM users.user_tees WHERE id = ANY($1::uuid[])", ut_ids)
            ut_ratings = await conn.fetch("SELECT * FROM users.user_tee_ratings WHERE tee_id = ANY($1::uuid[])", ut_ids)
            ut_ratings_by_id = defaultdict(list)
            for rating in ut_ratings:
                ut_ratings_by_id[rating["tee_id"]].append(rating)
            for r in ut_rows:
                user_tees_by_id[str(r["id"])] = user_tee_from_row(r, ut_ratings_by_id[r["id"]])

        # Query 7 (conditional): batch-resolve missing tee colors
        tee_colors_by_id: dict = {}
        if tee_id_lookup:
            tc_rows = await conn.fetch("SELECT id, color FROM courses.tees WHERE id = ANY($1::uuid[])", tee_id_lookup)
            tee_colors_by_id = {str(r["id"]): r["color"] for r in tc_rows}

        # Assemble in memory
        rounds = []
        for row in round_rows:
            rid = str(row["id"])
            cid = str(row["course_id"]) if row["course_id"] else None
            tee_color = row["tee_box_played"] or (tee_colors_by_id.get(str(row["tee_id"])) if row["tee_id"] else None)
            user_tee = user_tees_by_id.get(str(row["user_tee_id"])) if row["user_tee_id"] else None
            rounds.append(round_from_rows(row, scores_by_round[rid], courses_by_id.get(cid), tee_color, user_tee))

        return rounds

    # ================================================================
    # Read
    # ================================================================

    async def get_round_owner_id(self, round_id: str) -> Optional[str]:
        """Return the user_id that owns a round, or None if not found."""
        try:
            rid = UUID(round_id)
        except (TypeError, ValueError):
            return None
        async with self._pool.acquire() as conn:
            row = await conn.fetchrow("SELECT user_id FROM users.rounds WHERE id = $1", rid)
            return str(row["user_id"]) if row else None

    async def get_played_courses_for_user(self, user_id: str) -> list:
        """Return distinct courses a user has rounds linked to."""
        async with self._pool.acquire() as conn:
            rows = await conn.fetch(
                """SELECT DISTINCT c.id, c.name, c.location
                   FROM users.rounds r
                   JOIN courses.courses c ON r.course_id = c.id
                   WHERE r.user_id = $1
                   ORDER BY c.name""",
                UUID(user_id),
            )
        return [{"id": str(r["id"]), "name": r["name"], "location": r["location"]} for r in rows]

    async def get_round(self, round_id: str, *, user_id=None, connection=None) -> Optional[Round]:
        """Get a round with hole_scores and course data."""
        if connection is not None:
            return await self._get_round_on(connection, round_id, user_id)
        async with self._pool.acquire() as conn:
            return await self._get_round_on(conn, round_id, user_id)

    async def _get_round_on(self, conn, round_id: str, user_id) -> Optional[Round]:
        values = [UUID(round_id)]
        where = "id = $1"
        if user_id:
            values.append(UUID(user_id))
            where += " AND user_id = $2"
        row = await conn.fetchrow(f"SELECT * FROM users.rounds WHERE {where}", *values)
        if not row:
            return None
        return await self._assemble_round(conn, row)

    async def get_round_summaries_for_user(self, user_id: str, *, limit=100, offset=0) -> list[dict]:
        """Aggregate the same scored/observed sets as Round without loading nested models."""
        async with self._pool.acquire() as conn:
            rows = await conn.fetch(
                """
                WITH selected AS (
                    SELECT r.*, c.name, c.location, c.par AS stored_course_par, c.total_holes AS course_total_holes
                    FROM users.rounds r LEFT JOIN courses.courses c ON c.id=r.course_id
                    WHERE r.user_id=$1
                    ORDER BY r.round_date DESC NULLS LAST,r.created_at DESC NULLS LAST,r.id DESC
                    LIMIT $2 OFFSET $3
                )
                SELECT r.id,r.course_id,r.tee_box_played AS tee_box,r.round_date,r.notes,
                       r.course_name_played,COALESCE(r.course_name_played,r.name) AS course_name,
                       r.location AS course_location,
                       CASE WHEN observations.outside_coverage > 0 THEN NULL
                            WHEN pars.known_pars=cardinality(coverage.expected) THEN pars.total_par
                            WHEN coverage.expected=ARRAY(SELECT generate_series(1,layout.hole_count))
                                 AND NOT EXISTS (SELECT 1 FROM courses.holes ch
                                                 WHERE ch.course_id=r.course_id AND ch.par IS NOT NULL)
                                 AND NOT EXISTS (SELECT 1 FROM users.hole_scores hs
                                                 WHERE hs.round_id=r.id AND hs.par_played IS NOT NULL)
                            THEN r.stored_course_par END AS course_par,
                       CASE WHEN observations.outside_coverage=0 THEN observations.total_score END AS total_score,
                       CASE WHEN observations.outside_coverage=0 AND observations.known_scored_pars=observations.scored
                                 THEN observations.observed_to_par END AS to_par,
                       CASE WHEN observations.outside_coverage > 0 THEN NULL
                            WHEN observations.known_putts=0 THEN r.supplied_total_putts
                            WHEN observations.known_putts=observations.scored THEN observations.putts END AS total_putts,
                       CASE WHEN observations.outside_coverage > 0 THEN NULL
                            WHEN observations.known_gir=0 THEN r.supplied_total_gir
                            WHEN observations.known_gir=observations.scored THEN observations.gir END AS total_gir,
                       CASE WHEN observations.outside_coverage=0 THEN observations.fairways END AS fairways_hit,
                       CASE WHEN observations.outside_coverage=0 THEN observations.front_nine END AS front_nine,
                       CASE WHEN observations.outside_coverage=0 THEN observations.back_nine END AS back_nine,
                       observations.hole_scores_summary
                FROM selected r
                LEFT JOIN LATERAL (
                    SELECT COALESCE(r.course_total_holes,
                        CASE WHEN (SELECT COUNT(*) FROM courses.holes WHERE course_id=r.course_id)=18
                             THEN 18 END) AS hole_count
                ) layout ON TRUE
                LEFT JOIN LATERAL (
                    SELECT COALESCE(r.intended_holes,
                        CASE WHEN layout.hole_count IS NOT NULL
                                  THEN ARRAY(SELECT generate_series(1,layout.hole_count))
                             WHEN (SELECT COUNT(*) FROM users.hole_scores WHERE round_id=r.id)=18
                                  THEN ARRAY(SELECT generate_series(1,18)) END) AS expected
                ) coverage ON TRUE
                LEFT JOIN LATERAL (
                    SELECT COUNT(*) FILTER (WHERE p.par IS NOT NULL) AS known_pars,SUM(p.par) AS total_par
                    FROM (
                        SELECT COALESCE(hs.par_played,ch.par) AS par
                        FROM unnest(coverage.expected) number
                        LEFT JOIN users.hole_scores hs ON hs.round_id=r.id AND hs.hole_number=number
                        LEFT JOIN courses.holes ch ON ch.course_id=r.course_id AND ch.hole_number=number
                    ) p
                ) pars ON TRUE
                LEFT JOIN LATERAL (
                    SELECT COUNT(*) FILTER (WHERE eligible) AS scored,
                           COUNT(*) FILTER (WHERE eligible AND coverage.expected IS NOT NULL
                                             AND NOT h.hole_number=ANY(coverage.expected)) AS outside_coverage,
                           SUM(h.strokes) FILTER (WHERE eligible) AS total_score,
                           COUNT(*) FILTER (WHERE eligible AND COALESCE(h.par_played,ch.par) IS NOT NULL) AS known_scored_pars,
                           SUM(h.strokes-COALESCE(h.par_played,ch.par)) FILTER (WHERE eligible) AS observed_to_par,
                           COUNT(h.putts) FILTER (WHERE eligible) AS known_putts,
                           SUM(h.putts) FILTER (WHERE eligible) AS putts,
                           COUNT(h.green_in_regulation) FILTER (WHERE eligible) AS known_gir,
                           SUM(h.green_in_regulation::INTEGER) FILTER (WHERE eligible) AS gir,
                           SUM(h.fairway_hit::INTEGER) FILTER (WHERE eligible) AS fairways,
                           SUM(h.strokes) FILTER (WHERE eligible AND h.hole_number<=9) AS front_nine,
                           SUM(h.strokes) FILTER (WHERE eligible AND h.hole_number>=10) AS back_nine,
                           json_agg(json_build_object('h',h.hole_number,'s',h.strokes,'p',h.par_played)
                                    ORDER BY h.hole_number) AS hole_scores_summary
                    FROM users.hole_scores h
                    LEFT JOIN courses.holes ch ON ch.course_id=r.course_id AND ch.hole_number=h.hole_number
                    CROSS JOIN LATERAL (SELECT h.strokes IS NOT NULL AND h.played IS DISTINCT FROM FALSE AS eligible) e
                    WHERE h.round_id=r.id
                ) observations ON TRUE
                ORDER BY r.round_date DESC NULLS LAST,r.created_at DESC NULLS LAST,r.id DESC
                """,
                UUID(user_id),
                limit,
                offset,
            )
        result = []
        for row in rows:
            summary = dict(row)
            raw = summary.get("hole_scores_summary")
            if isinstance(raw, str):
                summary["hole_scores_summary"] = json.loads(raw)
            result.append(summary)
        return result

    async def get_rounds_for_user(
        self,
        user_id: str,
        *,
        limit: int = 20,
        offset: int = 0,
        course_id: Optional[str] = None,
        date_from: Optional[date] = None,
    ) -> List[Round]:
        """Get a user's rounds ordered by date DESC."""
        conditions = ["user_id = $1"]
        params: list = [UUID(user_id)]
        n = 2
        if course_id is not None:
            conditions.append(f"course_id = ${n}")
            params.append(UUID(course_id))
            n += 1
        if date_from is not None:
            conditions.append(f"round_date >= ${n}")
            params.append(date_from)
            n += 1
        where = " AND ".join(conditions)
        params += [limit, offset]
        async with self._pool.acquire() as conn:
            rows = await conn.fetch(
                f"""SELECT * FROM users.rounds
                   WHERE {where}
                   ORDER BY round_date DESC NULLS LAST, created_at DESC NULLS LAST, id DESC
                   LIMIT ${n} OFFSET ${n + 1}""",
                *params,
            )
            return await self._get_rounds_bulk(conn, rows)

    # ================================================================
    # Create
    # ================================================================

    async def create_round(
        self,
        round_: Round,
        user_id: str,
        *,
        course_id: Optional[str] = None,
        tee_id: Optional[str] = None,
        user_tee_id: Optional[str] = None,
        connection=None,
    ) -> Round:
        """Create a round with all hole_scores in a transaction.

        With ``connection``, joins the caller's transaction so the round commits or rolls back with it.

        Resolves course_id from round_.course.id if not provided.
        Resolves tee_id from round_.tee_box + course if not provided.
        """
        try:
            # Validate numbered/nonempty shape before any writes (course trust is Services-owned).
            round_to_row(round_, UUID(user_id))
            new_round_id: UUID
            async with write_transaction(self._pool, connection) as conn:
                # Resolve IDs
                resolved_course_id = (
                    UUID(course_id)
                    if course_id
                    else UUID(round_.course.id)
                    if round_.course and round_.course.id
                    else None
                )
                resolved_tee_id = UUID(tee_id) if tee_id else None
                resolved_user_tee_id = (
                    UUID(user_tee_id)
                    if user_tee_id
                    else (UUID(round_.user_tee.id) if round_.user_tee and round_.user_tee.id else None)
                )
                if round_.course and round_.course.id and UUID(round_.course.id) != resolved_course_id:
                    raise IntegrityError("Round course and explicit course ID disagree")
                if round_.user_tee and round_.user_tee.id and UUID(round_.user_tee.id) != resolved_user_tee_id:
                    raise IntegrityError("Round custom tee and explicit custom tee ID disagree")
                linked_course = await self._validate_references(
                    conn,
                    UUID(user_id),
                    resolved_course_id,
                    resolved_tee_id,
                    resolved_user_tee_id,
                )
                if linked_course and linked_course.get("total_holes") == 9:
                    numbers = [score.hole_number for score in round_.hole_scores]
                    if any(number > 9 for number in numbers) or any(
                        number > 9 for number in (round_.intended_holes or ())
                    ):
                        raise IntegrityError("Round holes are outside the linked course layout")
                if resolved_course_id is not None:
                    stored_course = await self._course_repo.get_course(str(resolved_course_id), connection=conn)
                    if stored_course is None:
                        raise IntegrityError("Linked course is missing")
                    # Accepted snapshots stay authoritative; fallback metadata comes from DB, not caller copies.
                    round_ = Round(**{**round_.model_dump(), "course": stored_course})

                if not resolved_tee_id and resolved_course_id and round_.tee_box:
                    resolved_tee_id = await self._resolve_tee_id(conn, resolved_course_id, round_.tee_box)

                # Insert round
                row_data = round_to_row(round_, UUID(user_id), resolved_course_id, resolved_tee_id)
                round_row = await conn.fetchrow(
                    """INSERT INTO users.rounds
                       (user_id, course_id, tee_id, user_tee_id, round_date, total_score,
                        is_complete, holes_played, weather_conditions, notes,
                        course_name_played, tee_box_played, intended_holes,
                        supplied_total_putts, supplied_total_gir)
                       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
                       RETURNING *""",
                    row_data["user_id"],
                    row_data["course_id"],
                    row_data["tee_id"],
                    resolved_user_tee_id,
                    row_data["round_date"],
                    row_data["total_score"],
                    row_data["is_complete"],
                    row_data["holes_played"],
                    row_data["weather_conditions"],
                    row_data["notes"],
                    row_data["course_name_played"],
                    row_data["tee_box_played"],
                    row_data["intended_holes"],
                    row_data["supplied_total_putts"],
                    row_data["supplied_total_gir"],
                )
                new_round_id = round_row["id"]

                # Map hole_number -> hole_id for FK resolution
                hole_id_map = {}
                if resolved_course_id:
                    hole_id_map = await self._load_hole_id_map(conn, resolved_course_id)

                # Build par_by_hole from course holes for populating par_played
                par_by_hole = {}
                if round_.course and round_.course.holes:
                    for h in round_.course.holes:
                        if h.number is not None and h.par is not None:
                            par_by_hole[h.number] = h.par

                # Batch insert hole scores
                if round_.hole_scores:
                    score_tuples = []
                    for hs in round_.hole_scores:
                        hole_id = hole_id_map.get(hs.hole_number)
                        # Populate par_played from course if available, else keep existing
                        if hs.hole_number in par_by_hole and hs.par_played is None:
                            hs = HoleScore(**{**hs.model_dump(), "par_played": par_by_hole[hs.hole_number]})
                        score_tuples.append(hole_score_to_row(hs, new_round_id, hole_id))
                    if score_tuples:
                        await conn.executemany(
                            """INSERT INTO users.hole_scores
                               (round_id, hole_id, hole_number, strokes,
                                net_score, putts, shots_to_green,
                                fairway_hit, green_in_regulation,
                                par_played, handicap_played, played)
                               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)""",
                            score_tuples,
                        )
            # Return the stored state; inside a caller's transaction it is only visible on that connection.
            return await self.get_round(str(new_round_id), connection=connection)
        except asyncpg.UniqueViolationError as e:
            raise DuplicateError(str(e)) from e
        except asyncpg.IntegrityConstraintViolationError as e:
            raise IntegrityError(str(e)) from e
        except ValidationError as error:
            raise IntegrityError("Round data conflicts with the linked course layout") from error

    # ================================================================
    # Update
    # ================================================================

    async def update_round(self, round_id: str, *, user_id=None, **fields) -> Optional[Round]:
        """Validate metadata and derived-state changes under one parent-row lock."""
        field_map = {
            "round_date": "date",
            "weather_conditions": "weather_conditions",
            "notes": "notes",
            "course_name_played": "course_name_played",
            "tee_box_played": "tee_box",
            "intended_holes": "intended_holes",
            "supplied_total_putts": "total_putts",
            "supplied_total_gir": "total_gir",
        }
        allowed = set(field_map) | {
            "tee_id",
            "user_tee_id",
            "total_score",
            "holes_played",
            "is_complete",
            "adjusted_gross_score",
            "score_differential",
        }
        updates = {name: value for name, value in fields.items() if name in allowed}
        if not updates:
            return await self.get_round(round_id, user_id=user_id)
        try:
            async with self._pool.acquire() as conn, conn.transaction():
                values = [UUID(round_id)]
                where = "id = $1"
                if user_id:
                    values.append(UUID(user_id))
                    where += " AND user_id = $2"
                row = await conn.fetchrow(f"SELECT * FROM users.rounds WHERE {where} FOR UPDATE", *values)
                if not row:
                    return None
                round_ = await self._assemble_round(conn, row)
                changes = {field_map[name]: value for name, value in updates.items() if name in field_map}
                error = round_.update_fields(**changes)
                if error:
                    raise IntegrityError(error)
                if "tee_box_played" in updates and "tee_id" not in updates:
                    updates["tee_id"] = (
                        await self._resolve_tee_id(conn, row["course_id"], round_.tee_box)
                        if row["course_id"] and round_.tee_box
                        else None
                    )
                for identity in ("tee_id", "user_tee_id"):
                    if identity in updates and updates[identity] is not None:
                        updates[identity] = UUID(str(updates[identity]))
                await self._validate_references(
                    conn,
                    row["user_id"],
                    row["course_id"],
                    updates.get("tee_id", row["tee_id"]),
                    updates.get("user_tee_id", row["user_tee_id"]),
                )
                derived = round_to_row(round_, row["user_id"])
                for name in ("total_score", "holes_played", "is_complete"):
                    if name in updates and updates[name] != derived[name]:
                        raise IntegrityError("Round totals and completeness are derived from hole observations")
                values = [row["id"]] + list(updates.values())
                assignments = ", ".join(f"{name} = ${index}" for index, name in enumerate(updates, 2))
                await conn.execute(f"UPDATE users.rounds SET {assignments} WHERE id = $1", *values)
                await self._persist_derived_state(conn, row["id"], round_, row["user_id"])
                # References may have changed, so reassemble inside the transaction before returning.
                fresh = await conn.fetchrow("SELECT * FROM users.rounds WHERE id = $1", row["id"])
                return await self._assemble_round(conn, fresh)
        except asyncpg.UniqueViolationError as error:
            raise DuplicateError("Conflicting round identity") from error
        except asyncpg.IntegrityConstraintViolationError as error:
            raise IntegrityError("Invalid round metadata or reference") from error

    async def _persist_derived_state(self, conn, round_id: UUID, round_: Round, user_id: UUID) -> None:
        data = round_to_row(round_, user_id)
        await conn.execute(
            """UPDATE users.rounds SET total_score=$2, holes_played=$3, is_complete=$4,
                   supplied_total_putts=$5, supplied_total_gir=$6 WHERE id=$1""",
            round_id,
            data["total_score"],
            data["holes_played"],
            data["is_complete"],
            data["supplied_total_putts"],
            data["supplied_total_gir"],
        )

    async def upsert_hole_score(self, round_id: str, hole_score: HoleScore, *, user_id=None) -> None:
        """Replace one numbered observation with the same atomic derived-state rules as a batch."""
        await self.update_hole_scores(round_id, [hole_score], user_id=user_id)

    async def update_hole_scores(self, round_id: str, hole_scores: list, *, user_id=None) -> Optional[Round]:
        """Replace supplied hole objects, preserving existing historical snapshots when absent."""
        numbers = [score.hole_number for score in hole_scores]
        if None in numbers or len(numbers) != len(set(numbers)):
            raise IntegrityError("Hole updates require unique numbered observations")
        try:
            async with self._pool.acquire() as conn, conn.transaction():
                values = [UUID(round_id)]
                where = "id = $1"
                if user_id:
                    values.append(UUID(user_id))
                    where += " AND user_id = $2"
                row = await conn.fetchrow(f"SELECT * FROM users.rounds WHERE {where} FOR UPDATE", *values)
                if not row:
                    raise NotFoundError("Round not found")
                round_ = await self._assemble_round(conn, row)
                by_number = {score.hole_number: score for score in round_.hole_scores}
                for score in hole_scores:
                    if round_.course:
                        expected = round_.course.get_expected_holes()
                        if expected and score.hole_number not in expected:
                            raise IntegrityError("Hole is outside the linked course layout")
                    old_score = by_number.get(score.hole_number)
                    payload = score.model_dump()
                    if old_score is not None:
                        for snapshot in ("par_played", "handicap_played"):
                            if payload[snapshot] is None:
                                payload[snapshot] = getattr(old_score, snapshot)
                    by_number[score.hole_number] = HoleScore(**payload)
                error = round_.update_field(
                    "hole_scores", sorted(by_number.values(), key=lambda score: score.hole_number)
                )
                if error:
                    raise IntegrityError(error)
                # Check before the first child write, including the last-score-cleared case.
                round_to_row(round_, row["user_id"])
                hole_ids = await self._load_hole_id_map(conn, row["course_id"]) if row["course_id"] else {}
                updated_scores = [by_number[number] for number in numbers]
                await conn.executemany(
                    """INSERT INTO users.hole_scores
                       (round_id,hole_id,hole_number,strokes,net_score,putts,shots_to_green,
                        fairway_hit,green_in_regulation,par_played,handicap_played,played)
                       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
                       ON CONFLICT (round_id,hole_number) DO UPDATE SET
                           hole_id=EXCLUDED.hole_id, strokes=EXCLUDED.strokes, net_score=EXCLUDED.net_score,
                           putts=EXCLUDED.putts, shots_to_green=EXCLUDED.shots_to_green,
                           fairway_hit=EXCLUDED.fairway_hit, green_in_regulation=EXCLUDED.green_in_regulation,
                           par_played=EXCLUDED.par_played, handicap_played=EXCLUDED.handicap_played,
                           played=EXCLUDED.played""",
                    [hole_score_to_row(score, row["id"], hole_ids.get(score.hole_number)) for score in updated_scores],
                )
                await self._persist_derived_state(conn, row["id"], round_, row["user_id"])
                return round_
        except asyncpg.UniqueViolationError as error:
            raise DuplicateError("Duplicate hole identity") from error
        except asyncpg.IntegrityConstraintViolationError as error:
            raise IntegrityError("Invalid hole score or reference") from error

    async def link_course_to_round(self, round_id: str, course_id: str, *, user_id=None) -> Optional[Round]:
        """Relink references atomically while retaining accepted historical hole snapshots."""
        try:
            async with self._pool.acquire() as conn, conn.transaction():
                values = [UUID(round_id)]
                where = "id = $1"
                if user_id:
                    values.append(UUID(user_id))
                    where += " AND user_id = $2"
                row = await conn.fetchrow(f"SELECT * FROM users.rounds WHERE {where} FOR UPDATE", *values)
                if not row:
                    return None
                await self._validate_references(conn, row["user_id"], UUID(course_id), None, None)
                course = await self._course_repo.get_course(course_id, connection=conn)
                round_ = await self._assemble_round(conn, row)
                custom = round_.user_tee
                if custom and custom.course_id is not None and custom.course_id != course_id:
                    custom = None
                scores = []
                for score in round_.hole_scores:
                    hole = course.get_hole(score.hole_number)
                    data = score.model_dump()
                    if hole:
                        if data["par_played"] is None:
                            data["par_played"] = hole.par
                        if data["handicap_played"] is None:
                            data["handicap_played"] = hole.handicap
                    scores.append(HoleScore(**data))
                error = round_.update_fields(
                    course=course, user_tee=custom, course_name_played=None, hole_scores=scores
                )
                if error:
                    raise IntegrityError(error)
                round_to_row(round_, row["user_id"])
                tee_id = await self._resolve_tee_id(conn, UUID(course_id), round_.tee_box) if round_.tee_box else None
                user_tee_id = row["user_tee_id"] if custom is not None else None
                await self._validate_references(conn, row["user_id"], UUID(course_id), tee_id, user_tee_id)
                await conn.execute(
                    """UPDATE users.rounds SET course_id=$2, tee_id=$3, user_tee_id=$4, course_name_played=NULL
                       WHERE id=$1""",
                    row["id"],
                    UUID(course_id),
                    tee_id,
                    user_tee_id,
                )
                hole_ids = await self._load_hole_id_map(conn, UUID(course_id))
                for score in scores:
                    await conn.execute(
                        """UPDATE users.hole_scores SET hole_id=$3, par_played=$4, handicap_played=$5
                           WHERE round_id=$1 AND hole_number=$2""",
                        row["id"],
                        score.hole_number,
                        hole_ids.get(score.hole_number),
                        score.par_played,
                        score.handicap_played,
                    )
                await self._persist_derived_state(conn, row["id"], round_, row["user_id"])
                return round_
        except asyncpg.IntegrityConstraintViolationError as error:
            raise IntegrityError("Invalid course relink or reference") from error

    # ================================================================
    # Delete
    # ================================================================

    async def delete_round(self, round_id: str, *, user_id: Optional[str] = None) -> bool:
        """Delete round and its hole_scores (CASCADE). Returns True if deleted."""
        async with self._pool.acquire() as conn:
            if user_id:
                result = await conn.execute(
                    "DELETE FROM users.rounds WHERE id = $1 AND user_id = $2",
                    UUID(round_id),
                    UUID(user_id),
                )
            else:
                result = await conn.execute("DELETE FROM users.rounds WHERE id = $1", UUID(round_id))
            return result == "DELETE 1"

    # ================================================================
    # Scorecard Scans
    # ================================================================

    async def save_scan(
        self,
        *,
        round_id: Optional[str] = None,
        image_path: str,
        llm_model: str,
        llm_raw_json: dict,
    ) -> str:
        """Save a scorecard scan record. Returns the scan ID."""
        async with self._pool.acquire() as conn:
            row = await conn.fetchrow(
                """INSERT INTO users.scorecard_scans
                   (round_id, image_path, llm_model, llm_raw_json)
                   VALUES ($1, $2, $3, $4) RETURNING id""",
                UUID(round_id) if round_id else None,
                image_path,
                llm_model,
                json.dumps(llm_raw_json),
            )
            return str(row["id"])

    async def get_scans_for_round(self, round_id: str) -> list:
        """Get all scans associated with a round."""
        async with self._pool.acquire() as conn:
            rows = await conn.fetch(
                """SELECT * FROM users.scorecard_scans
                   WHERE round_id = $1 ORDER BY created_at""",
                UUID(round_id),
            )
            return [dict(r) for r in rows]
