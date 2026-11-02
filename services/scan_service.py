"""Scan save service — plans and validates a reviewed scan, then writes course and round atomically.

Course identity always comes from the user's choice: an existing course (``course_id``), a picked
golf course API result (``external_course_id``), or a typed name. Scanned course data (pars,
handicaps, tees, yardages, ratings) is what gets stored. The provider is only used to verify a scan;
its data is compared in memory and never stored, and location is never taken from scan or provider.
"""

import logging
from dataclasses import dataclass
from datetime import datetime
from typing import Dict, List, Optional, Tuple

from pydantic import ValidationError

from api.request_models import SaveRoundRequest, TeeInput
from database.db_manager import DatabaseManager
from database.exceptions import DuplicateError
from models import Course, Hole, HoleScore, Round, Tee
from models.hole_layout import FRONT_NINE, FULL_ROUND
from services.golfcourse_api_service import (
    CourseProviderNotFound,
    CourseProviderUnavailable,
    GolfCourseAPIService,
    ProviderTee,
)

logger = logging.getLogger(__name__)
_TEE_COLOR_TOKENS = (
    "black", "blue", "white", "gold", "red", "green",
    "silver", "yellow", "orange", "purple", "brown", "combo",
)


class ScanSaveRejected(ValueError):
    """The reviewed scan cannot be saved as submitted; nothing was written.

    ``reasons`` are user-facing sentences describing what to fix.
    """

    def __init__(self, reasons: List[str]):
        super().__init__("; ".join(reasons))
        self.reasons = reasons


@dataclass
class _CoursePlan:
    """What the write phase will do with the course; decided before any write."""

    course: Course                          # existing course, or the scanned course to create
    create_owner_id: Optional[str] = None   # set with create=True: None means a master course
    create: bool = False
    fill_gaps: bool = False                 # existing user-owned course: fill missing values only
    verified_update: Optional[Course] = None  # existing master: overwrite with verified scan data


class ScanService:
    def __init__(self, db: DatabaseManager, course_api: Optional[GolfCourseAPIService] = None) -> None:
        self._db = db
        self._course_api = course_api or GolfCourseAPIService()

    async def save_reviewed_scan(self, req: SaveRoundRequest) -> Round:
        """Plan and validate everything (including provider verification), then write in one transaction."""
        scan_tees = self._build_tees(req)
        scanned = self._build_scanned_course(req, scan_tees)
        plan = await self._plan_course(req, scanned)

        tee_box = self._canonicalize_played_tee_box(plan.course, req.tee_box, scan_tees)
        par_by_hole, handicap_by_hole = self._build_par_lookup(req, plan.course)
        hole_scores = self._build_hole_scores(req, par_by_hole, handicap_by_hole)
        played_on = self._parse_date(req.date)
        self._make_round(req, plan.course, tee_box, hole_scores, played_on)  # validate before writing

        async with self._db.transaction() as conn:
            course = await self._write_course(plan, req, scan_tees, conn)
            round_ = self._make_round(req, course, tee_box, hole_scores, played_on)
            return await self._db.rounds.create_round(
                round_, req.user_id, course_id=str(course.id), connection=conn
            )

    # ================================================================
    # Planning (reads and provider calls only)
    # ================================================================

    async def _plan_course(self, req: SaveRoundRequest, scanned: Course) -> _CoursePlan:
        if req.course_id:
            try:
                course = await self._db.courses.get_course(req.course_id)
            except Exception as exc:  # noqa: BLE001
                raise ValueError("Selected course_id is invalid.") from exc
            if not course:
                raise ValueError(f"Selected course not found: {req.course_id}")
            if course.user_id and str(course.user_id) != str(req.user_id):
                raise ValueError("Selected course is not accessible for this user.")
            return await self._plan_existing(course, req, scanned)

        if req.external_course_id:
            existing = await self._db.courses.find_course_by_external_id(
                req.external_course_id, user_id=req.user_id
            )
            if existing:
                return await self._plan_existing(existing, req, scanned)
            self._require_complete(scanned, req.tee_box)
            if await self._verify_with_provider(req.external_course_id, scanned):
                master = scanned.model_copy(update={"external_course_id": req.external_course_id})
                return _CoursePlan(course=master, create=True, create_owner_id=None)
            # Not verified: the course still exists for this user, without the provider link.
            return await self._plan_user_course(req, scanned)

        if req.course_name:
            return await self._plan_user_course(req, scanned)

        raise ScanSaveRejected(["Select or enter the course for this round."])

    async def _plan_user_course(self, req: SaveRoundRequest, scanned: Course) -> _CoursePlan:
        """Reuse the user's own course with this exact name, otherwise create it from the scan."""
        if not scanned.name:
            raise ScanSaveRejected(["Enter the course name."])
        own = await self._db.courses.find_owned_course_by_exact_name(scanned.name, req.user_id)
        if own:
            return await self._plan_existing(own, req, scanned)
        self._require_complete(scanned, req.tee_box)
        return _CoursePlan(course=scanned, create=True, create_owner_id=req.user_id)

    async def _plan_existing(self, course: Course, req: SaveRoundRequest, scanned: Course) -> _CoursePlan:
        if course.user_id is not None:
            return _CoursePlan(course=course, fill_gaps=str(course.user_id) == str(req.user_id))
        # Master course: update it only from a complete scan that the provider verifies.
        # Without a provider ID, or when verification fails, the round saves against it unchanged.
        if (
            course.external_course_id
            and self._scan_differs_from(course, scanned)
            and scanned.has_required_course_data()
            and await self._verify_with_provider(course.external_course_id, scanned)
        ):
            return _CoursePlan(course=course, verified_update=scanned)
        return _CoursePlan(course=course)

    async def _verify_with_provider(self, external_course_id: str, scanned: Course) -> bool:
        try:
            provider_tees = await self._course_api.get_course_details(external_course_id)
        except (CourseProviderUnavailable, CourseProviderNotFound) as exc:
            logger.info("Course verification skipped for external_course_id=%s: %s",
                        external_course_id, type(exc).__name__)
            return False
        verified = self._scan_matches_provider(scanned, provider_tees)
        logger.info("Course verification for external_course_id=%s: verified=%s", external_course_id, verified)
        return verified

    @staticmethod
    def _scan_matches_provider(scanned: Course, provider_tees: List[ProviderTee]) -> bool:
        """Exact match: each scanned tee equals some provider tee's yardage on every expected hole
        (names ignored), and the scanned pars equal that provider tee's pars."""
        expected = scanned.get_expected_holes()
        if expected is None or not scanned.tees:
            return False
        pars = {hole.number: hole.par for hole in scanned.holes}
        if any(pars.get(n) is None for n in expected):
            return False
        for tee in scanned.tees:
            if any(n not in tee.hole_yardages for n in expected):
                return False
            same_yardages = [
                p for p in provider_tees if all(p.yardages.get(n) == tee.hole_yardages[n] for n in expected)
            ]
            if not any(all(p.pars.get(n) == pars[n] for n in expected) for p in same_yardages):
                return False
        return True

    @staticmethod
    def _scan_differs_from(course: Course, scanned: Course) -> bool:
        """True when the scan adds or changes a par, handicap, or tee yardage set on the course."""
        for hole in scanned.holes:
            existing = course.get_hole(hole.number) if hole.number is not None else None
            if existing is None or (hole.par, hole.handicap) != (existing.par, existing.handicap):
                return True
        known_yardages = [dict(tee.hole_yardages) for tee in course.tees]
        return any(dict(tee.hole_yardages) not in known_yardages for tee in scanned.tees if tee.hole_yardages)

    @staticmethod
    def _require_complete(course: Course, selected_tee: Optional[str]) -> None:
        """A new course needs par on every expected hole and one tee with every yardage."""
        reasons: List[str] = []
        if not course.name:
            reasons.append("Enter the course name.")
        expected = course.get_expected_holes()
        if expected is None:
            reasons.append("Course holes must cover holes 1-9 or 1-18.")
        else:
            pars = {hole.number: hole.par for hole in course.holes}
            missing_par = [n for n in expected if pars.get(n) is None]
            if missing_par:
                reasons.append(f"Missing par for holes {', '.join(map(str, missing_par))}.")
            complete_tees = [t for t in course.tees if all(n in t.hole_yardages for n in expected)]
            if not complete_tees:
                reasons.append("No tee has a yardage for every hole.")
            elif selected_tee and course.get_tee(selected_tee) not in complete_tees:
                reasons.append(f"The selected tee '{selected_tee}' needs a yardage for every hole.")
        if not reasons and not course.has_required_course_data(selected_tee):
            reasons.append("Course data is incomplete.")
        if reasons:
            raise ScanSaveRejected(["Course data is incomplete."] + reasons)

    # ================================================================
    # Building validated models from the reviewed scan
    # ================================================================

    def _build_scanned_course(self, req: SaveRoundRequest, scan_tees: List[TeeInput]) -> Course:
        """The course exactly as scanned and reviewed; never carries a location."""
        holes = [h for h in (req.course_holes or []) if h.hole_number is not None]
        numbers = tuple(sorted(h.hole_number for h in holes))
        layout = 18 if numbers == FULL_ROUND else 9 if numbers == FRONT_NINE else None
        colors = [t.color.casefold() for t in scan_tees]
        if len(colors) != len(set(colors)):
            raise ScanSaveRejected(["Each tee on the scorecard needs a different name."])
        try:
            return Course(
                name=req.course_name,
                total_holes=layout,
                holes=[Hole(number=h.hole_number, par=h.par, handicap=h.handicap) for h in holes],
                tees=[
                    Tee(
                        color=t.color,
                        slope_rating=t.slope_rating,
                        course_rating=t.course_rating,
                        hole_yardages=self._tee_input_yardages(t),
                    )
                    for t in scan_tees
                ],
            )
        except ValidationError as exc:
            raise ScanSaveRejected(["Course data on the scorecard is invalid."] + _messages(exc)) from exc

    def _build_tees(self, req: SaveRoundRequest) -> List[TeeInput]:
        """Normalised tee list: all_tees preferred, single played tee as fallback."""
        if req.all_tees:
            return [t for t in req.all_tees if t.color]
        if req.tee_box:
            return [TeeInput(
                color=req.tee_box,
                slope_rating=req.tee_slope_rating,
                course_rating=req.tee_course_rating,
                hole_yardages=req.tee_yardages or {},
            )]
        return []

    def _build_par_lookup(
        self, req: SaveRoundRequest, course: Optional[Course]
    ) -> Tuple[dict, dict]:
        """Build hole→par and hole→handicap dicts.

        Course holes are authoritative; scan holes fill any remaining gaps.
        """
        par_by_hole: dict = {}
        handicap_by_hole: dict = {}
        if course and course.holes:
            for hole in course.holes:
                if hole.number is not None:
                    if hole.par is not None:
                        par_by_hole[hole.number] = hole.par
                    if hole.handicap is not None:
                        handicap_by_hole[hole.number] = hole.handicap
        for h in req.course_holes or []:
            if h.hole_number is not None:
                if h.par is not None and h.hole_number not in par_by_hole:
                    par_by_hole[h.hole_number] = h.par
                if h.handicap is not None and h.hole_number not in handicap_by_hole:
                    handicap_by_hole[h.hole_number] = h.handicap
        return par_by_hole, handicap_by_hole

    def _build_hole_scores(
        self,
        req: SaveRoundRequest,
        par_by_hole: dict,
        handicap_by_hole: dict,
    ) -> List[HoleScore]:
        """Build HoleScore list with par_played/handicap_played populated from lookup.

        Reviewed values are saved as entered; invalid combinations reject the save rather than
        being rewritten.
        """
        hole_scores = []
        reasons: List[str] = []
        for hs in req.hole_scores:
            hs_dict = hs.model_dump()
            hole_num = hs_dict.get("hole_number")
            if hole_num is not None:
                if hs_dict.get("par_played") is None:
                    hs_dict["par_played"] = par_by_hole.get(hole_num)
                if hs_dict.get("handicap_played") is None:
                    hs_dict["handicap_played"] = handicap_by_hole.get(hole_num)
            try:
                hole_scores.append(HoleScore(**hs_dict))
            except ValidationError as exc:
                reasons.extend(f"Hole {hole_num}: {message}" for message in _messages(exc))
        if reasons:
            raise ScanSaveRejected(["Some hole scores are invalid."] + reasons)
        return hole_scores

    @staticmethod
    def _parse_date(value: Optional[str]) -> Optional[datetime]:
        if not value:
            return None
        try:
            return datetime.fromisoformat(value)
        except ValueError as exc:
            raise ScanSaveRejected(["The round date is not a valid date."]) from exc

    @staticmethod
    def _make_round(
        req: SaveRoundRequest,
        course: Course,
        tee_box: Optional[str],
        hole_scores: List[HoleScore],
        played_on: Optional[datetime],
    ) -> Round:
        try:
            return Round(course=course, tee_box=tee_box, date=played_on, hole_scores=hole_scores, notes=req.notes)
        except ValidationError as exc:
            raise ScanSaveRejected(["The round does not fit this course."] + _messages(exc)) from exc

    # ================================================================
    # Writing (inside the save transaction)
    # ================================================================

    async def _write_course(
        self, plan: _CoursePlan, req: SaveRoundRequest, scan_tees: List[TeeInput], conn
    ) -> Course:
        if plan.create:
            try:
                return await self._db.courses.create_course(
                    plan.course, user_id=plan.create_owner_id, connection=conn
                )
            except DuplicateError:
                if plan.create_owner_id is None and plan.course.external_course_id:
                    # Another save verified this course first; link to that master instead.
                    existing = await self._db.courses.find_course_by_external_id(
                        plan.course.external_course_id, connection=conn
                    )
                    if existing:
                        return existing
                raise ScanSaveRejected([
                    "A course with this name already exists. Select it from the course search instead."
                ])
        course_id = str(plan.course.id)
        if plan.verified_update is not None:
            scan = plan.verified_update
            await self._db.courses.apply_verified_scan(
                course_id, scan.holes, scan.tees, total_holes=scan.total_holes, connection=conn
            )
        elif plan.fill_gaps:
            holes = [Hole(number=h.hole_number, par=h.par, handicap=h.handicap)
                                       for h in (req.course_holes or [])]
            if scan_tees:
                for t in scan_tees:
                    await self._db.courses.fill_course_gaps(
                        course_id, holes, t.color, t.slope_rating, t.course_rating, t.hole_yardages,
                        connection=conn,
                    )
            elif holes:
                await self._db.courses.fill_course_gaps(course_id, holes, connection=conn)
        return plan.course

    # ================================================================
    # Played-tee canonicalization (explicit selections only)
    # ================================================================

    @staticmethod
    def _extract_tee_color_token(value: Optional[str]) -> Optional[str]:
        text = (value or "").strip().lower()
        if not text:
            return None
        for token in _TEE_COLOR_TOKENS:
            if token in text.split():
                return token
            if f"{token} " in text or f" {token}" in text:
                return token
            if text.startswith(token):
                return token
        return None

    @staticmethod
    def _tee_input_yardages(tee: TeeInput) -> Dict[int, int]:
        out: Dict[int, int] = {}
        for k, v in (tee.hole_yardages or {}).items():
            if v is None:
                continue
            try:
                hole_num = int(k)
            except Exception:  # noqa: BLE001
                continue
            out[hole_num] = int(v)
        return out

    @staticmethod
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

    def _best_matching_course_tee_color(
        self,
        course: Course,
        tee: TeeInput,
    ) -> Optional[str]:
        incoming = self._tee_input_yardages(tee)
        if not incoming:
            return None
        best_color: Optional[str] = None
        best_ratio = 0.0
        best_overlap = 0
        for course_tee in course.tees or []:
            if not course_tee.color:
                continue
            ratio, overlap = self._tee_yardage_similarity(
                incoming,
                {int(h): int(y) for h, y in (course_tee.hole_yardages or {}).items()},
            )
            if ratio > best_ratio or (ratio == best_ratio and overlap > best_overlap):
                best_ratio = ratio
                best_overlap = overlap
                best_color = course_tee.color
        if best_color and best_overlap >= 6 and best_ratio >= 0.7:
            return best_color
        return None

    def _canonicalize_played_tee_box(
        self,
        course: Optional[Course],
        tee_box: Optional[str],
        scan_tees: List[TeeInput],
    ) -> Optional[str]:
        """Map the user's tee selection onto the course's naming; never invent a selection."""
        if not tee_box or not course or not (course.tees or []):
            return tee_box

        # Exact match already uses canonical course naming.
        exact = course.get_tee(tee_box)
        if exact and exact.color:
            return exact.color

        # Try matching the selected scanned tee to an existing course tee by yardage.
        chosen_scan_tee = next(
            (t for t in scan_tees if t.color and t.color.strip().lower() == tee_box.strip().lower()),
            None,
        )
        if chosen_scan_tee:
            matched = self._best_matching_course_tee_color(course, chosen_scan_tee)
            if matched:
                return matched

        # Fallback: color token extraction (e.g. "WHITE M: 69.1/123" -> "White").
        token = self._extract_tee_color_token(tee_box)
        if token:
            for course_tee in course.tees:
                if course_tee.color and self._extract_tee_color_token(course_tee.color) == token:
                    return course_tee.color

        return tee_box


def _messages(error: ValidationError) -> List[str]:
    return [str(item.get("msg", "invalid value")).removeprefix("Value error, ") for item in error.errors()]
