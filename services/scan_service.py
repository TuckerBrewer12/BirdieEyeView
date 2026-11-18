import logging
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

from pydantic import ValidationError

from database.db_manager import DatabaseManager
from database.exceptions import DuplicateError
from models import Course, Hole, HoleScore, Round, Tee
from models.hole_layout import FRONT_NINE, FULL_ROUND, rated_coverage
from models.tee import best_yardage_match
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
    def __init__(self, reasons: List[str]):
        super().__init__("; ".join(reasons))
        self.reasons = reasons


@dataclass(frozen=True)
class ScannedTee:
    color: str
    slope_rating: Optional[float] = None
    course_rating: Optional[float] = None
    hole_yardages: Dict[int, int] = field(default_factory=dict)


@dataclass(frozen=True)
class ScannedHole:
    number: int
    par: Optional[int] = None
    handicap: Optional[int] = None


@dataclass(frozen=True)
class ReviewedScan:
    user_id: str
    hole_scores: List[Dict[str, Any]]
    course: Optional[Course] = None
    external_course_id: Optional[str] = None
    course_name: Optional[str] = None
    tee_box: Optional[str] = None
    tees: List[ScannedTee] = field(default_factory=list)
    course_holes: List[ScannedHole] = field(default_factory=list)
    played_on: Optional[datetime] = None
    notes: Optional[str] = None


@dataclass
class _CoursePlan:
    course: Course
    create_owner_id: Optional[str] = None
    create: bool = False
    fill_gaps: bool = False
    verified_update: Optional[Course] = None


class ScanService:
    def __init__(self, db: DatabaseManager, course_api: Optional[GolfCourseAPIService] = None) -> None:
        self._db = db
        self._course_api = course_api or GolfCourseAPIService()

    async def save_reviewed_scan(self, scan: ReviewedScan) -> Round:
        scanned = self._build_scanned_course(scan)
        plan = await self._plan_course(scan, scanned)

        tee_box = self._canonicalize_played_tee_box(plan.course, scan.tee_box, scan.tees)
        par_by_hole, handicap_by_hole = self._build_par_lookup(scan, plan.verified_update or plan.course)
        hole_scores = self._build_hole_scores(scan, par_by_hole, handicap_by_hole)
        self._make_round(scan, plan.course, tee_box, hole_scores)

        async with self._db.transaction() as conn:
            course = await self._write_course(plan, scan, conn)
            round_ = self._make_round(scan, course, tee_box, hole_scores)
            return await self._db.rounds.create_round(
                round_, scan.user_id, course_id=str(course.id), connection=conn
            )

    async def _plan_course(self, scan: ReviewedScan, scanned: Course) -> _CoursePlan:
        if scan.course is not None:
            return await self._plan_existing(scan.course, scan, scanned)

        if scan.external_course_id:
            existing = await self._db.courses.find_course_by_external_id(
                scan.external_course_id, user_id=scan.user_id
            )
            if existing:
                return await self._plan_existing(existing, scan, scanned)
            self._require_complete(scanned, scan.tee_box)
            verified = await self._verify_with_provider(scan.external_course_id, scanned)
            if verified is not None:
                master = verified.model_copy(update={"external_course_id": scan.external_course_id})
                return _CoursePlan(course=master, create=True, create_owner_id=None)
            return await self._plan_user_course(scan, scanned)

        if scan.course_name:
            return await self._plan_user_course(scan, scanned)

        raise ScanSaveRejected(["Select or enter the course for this round."])

    async def _plan_user_course(self, scan: ReviewedScan, scanned: Course) -> _CoursePlan:
        if not scanned.name:
            raise ScanSaveRejected(["Enter the course name."])
        own = await self._db.courses.find_owned_course_by_exact_name(scanned.name, scan.user_id)
        if own:
            return await self._plan_existing(own, scan, scanned)
        self._require_complete(scanned, scan.tee_box)
        return _CoursePlan(course=scanned, create=True, create_owner_id=scan.user_id)

    async def _plan_existing(self, course: Course, scan: ReviewedScan, scanned: Course) -> _CoursePlan:
        if course.user_id is not None:
            return _CoursePlan(course=course, fill_gaps=str(course.user_id) == str(scan.user_id))
        if not scanned.name:
            scanned = scanned.model_copy(update={"name": course.name})
        if (
            course.external_course_id
            and self._scan_covers_course(course, scanned)
            and self._scan_differs_from(course, scanned)
            and scanned.has_required_course_data()
        ):
            verified = await self._verify_with_provider(course.external_course_id, scanned)
            if verified is not None:
                update = self._keep_unscanned_ratings(course, verified)
                if self._scan_differs_from(course, update):
                    return _CoursePlan(course=course, verified_update=update)
        return _CoursePlan(course=course)

    async def _verify_with_provider(self, external_course_id: str, scanned: Course) -> Optional[Course]:
        try:
            provider_tees = await self._course_api.get_course_details(external_course_id)
        except (CourseProviderUnavailable, CourseProviderNotFound) as exc:
            logger.info("Course verification skipped for external_course_id=%s: %s",
                        external_course_id, type(exc).__name__)
            return None
        matches = self._provider_matches(scanned, provider_tees)
        logger.info("Course verification for external_course_id=%s: verified=%s",
                    external_course_id, matches is not None)
        if matches is None:
            return None
        tees = [
            tee if any(self._ratings_match(tee, p) for p in matched) else self._without_ratings(tee)
            for tee, matched in zip(scanned.tees, matches)
        ]
        return scanned.model_copy(update={"tees": tees})

    @staticmethod
    def _provider_matches(scanned: Course, provider_tees: List[ProviderTee]) -> Optional[List[List[ProviderTee]]]:
        expected = scanned.get_expected_holes()
        if expected is None or not scanned.tees:
            return None
        pars = {hole.number: hole.par for hole in scanned.holes}
        if any(pars.get(n) is None for n in expected):
            return None
        matches = []
        for tee in scanned.tees:
            if any(n not in tee.hole_yardages for n in expected):
                return None
            matched = [
                p for p in provider_tees
                if all(p.yardages.get(n) == tee.hole_yardages[n] and p.pars.get(n) == pars[n] for n in expected)
            ]
            if not matched:
                return None
            matches.append(matched)
        return matches

    @staticmethod
    def _scan_matches_provider(scanned: Course, provider_tees: List[ProviderTee]) -> bool:
        return ScanService._provider_matches(scanned, provider_tees) is not None

    @staticmethod
    def _without_ratings(tee: Tee) -> Tee:
        return tee.model_copy(update={"course_rating": None, "slope_rating": None, "rating_holes": None, "ratings": []})

    @staticmethod
    def _keep_unscanned_ratings(course: Course, scanned: Course) -> Course:
        tees = []
        for tee in scanned.tees:
            known = course.get_tee(tee.color) if tee.color else None
            if known is not None and tee.course_rating is None and tee.slope_rating is None and not tee.ratings:
                tee = tee.model_copy(update={
                    "course_rating": known.course_rating,
                    "slope_rating": known.slope_rating,
                    "rating_holes": known.rating_holes,
                    "ratings": list(known.ratings),
                })
            tees.append(tee)
        return scanned.model_copy(update={"tees": tees})

    @staticmethod
    def _ratings_match(tee: Tee, provider: ProviderTee) -> bool:
        if tee.course_rating is not None and (
            provider.course_rating is None or round(tee.course_rating, 1) != round(provider.course_rating, 1)
        ):
            return False
        return tee.slope_rating is None or tee.slope_rating == provider.slope_rating

    @staticmethod
    def _scan_covers_course(course: Course, scanned: Course) -> bool:
        expected = scanned.get_expected_holes()
        if expected is None or course.total_holes not in (None, scanned.total_holes):
            return False
        stored = {hole.number for hole in course.holes if hole.number is not None}
        stored.update(int(number) for tee in course.tees for number in tee.hole_yardages)
        return stored <= set(expected)

    @staticmethod
    def _scan_differs_from(course: Course, scanned: Course) -> bool:
        for hole in scanned.holes:
            existing = course.get_hole(hole.number) if hole.number is not None else None
            if existing is None or (hole.par, hole.handicap) != (existing.par, existing.handicap):
                return True
        for tee in scanned.tees:
            if not tee.hole_yardages:
                continue
            same = [known for known in course.tees if dict(known.hole_yardages) == dict(tee.hole_yardages)]
            if not same:
                return True
            if not any(
                tee.course_rating in (None, known.course_rating) and tee.slope_rating in (None, known.slope_rating)
                for known in same
            ):
                return True
        return False

    @staticmethod
    def _require_complete(course: Course, selected_tee: Optional[str]) -> None:
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
            raise ScanSaveRejected(["Course data is incomplete.", *reasons])

    def _build_scanned_course(self, scan: ReviewedScan) -> Course:
        holes = scan.course_holes
        numbers = tuple(sorted(h.number for h in holes))
        layout = 18 if numbers == FULL_ROUND else 9 if numbers == FRONT_NINE else None
        colors = [t.color.casefold() for t in scan.tees]
        if len(colors) != len(set(colors)):
            raise ScanSaveRejected(["Each tee on the scorecard needs a different name."])
        try:
            return Course(
                name=scan.course_name,
                total_holes=layout,
                holes=[Hole(number=h.number, par=h.par, handicap=h.handicap) for h in holes],
                tees=[
                    Tee(
                        color=t.color,
                        slope_rating=t.slope_rating,
                        course_rating=t.course_rating,
                        rating_holes=rated_coverage(numbers, t.course_rating, t.slope_rating),
                        hole_yardages=dict(t.hole_yardages),
                    )
                    for t in scan.tees
                ],
            )
        except ValidationError as exc:
            raise ScanSaveRejected(["Course data on the scorecard is invalid.", *_messages(exc)]) from exc

    def _build_par_lookup(
        self, scan: ReviewedScan, course: Optional[Course]
    ) -> Tuple[dict, dict]:
        par_by_hole: dict = {}
        handicap_by_hole: dict = {}
        if course and course.holes:
            for hole in course.holes:
                if hole.number is not None:
                    if hole.par is not None:
                        par_by_hole[hole.number] = hole.par
                    if hole.handicap is not None:
                        handicap_by_hole[hole.number] = hole.handicap
        for h in scan.course_holes:
            if h.par is not None and h.number not in par_by_hole:
                par_by_hole[h.number] = h.par
            if h.handicap is not None and h.number not in handicap_by_hole:
                handicap_by_hole[h.number] = h.handicap
        return par_by_hole, handicap_by_hole

    def _build_hole_scores(
        self,
        scan: ReviewedScan,
        par_by_hole: dict,
        handicap_by_hole: dict,
    ) -> List[HoleScore]:
        hole_scores = []
        reasons: List[str] = []
        for entered in scan.hole_scores:
            hs_dict = dict(entered)
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
            raise ScanSaveRejected(["Some hole scores are invalid.", *reasons])
        return hole_scores

    @staticmethod
    def _make_round(
        scan: ReviewedScan,
        course: Course,
        tee_box: Optional[str],
        hole_scores: List[HoleScore],
    ) -> Round:
        try:
            return Round(course=course, tee_box=tee_box, date=scan.played_on, hole_scores=hole_scores, notes=scan.notes)
        except ValidationError as exc:
            raise ScanSaveRejected(["The round does not fit this course.", *_messages(exc)]) from exc

    async def _write_course(self, plan: _CoursePlan, scan: ReviewedScan, conn) -> Course:
        if plan.create:
            try:
                return await self._db.courses.create_course(
                    plan.course, user_id=plan.create_owner_id, connection=conn
                )
            except DuplicateError:
                if plan.create_owner_id is None and plan.course.external_course_id:
                    existing = await self._db.courses.find_course_by_external_id(
                        plan.course.external_course_id, connection=conn
                    )
                    if existing:
                        return existing
                raise ScanSaveRejected([
                    "A course with this name already exists. Select it from the course search instead."
                ]) from None
        course_id = str(plan.course.id)
        if plan.verified_update is not None:
            scan = plan.verified_update
            await self._db.courses.apply_verified_scan(
                course_id, scan.holes, scan.tees, total_holes=scan.total_holes, connection=conn
            )
        elif plan.fill_gaps:
            holes = [Hole(number=h.number, par=h.par, handicap=h.handicap) for h in scan.course_holes]
            if scan.tees:
                for t in scan.tees:
                    await self._db.courses.fill_course_gaps(
                        course_id, holes, t.color, t.slope_rating, t.course_rating, dict(t.hole_yardages),
                        connection=conn,
                    )
            elif holes:
                await self._db.courses.fill_course_gaps(course_id, holes, connection=conn)
        return plan.course

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
    def _best_matching_course_tee_color(course: Course, tee: ScannedTee) -> Optional[str]:
        return best_yardage_match(
            tee.hole_yardages,
            (
                (course_tee.color, {int(h): int(y) for h, y in (course_tee.hole_yardages or {}).items()})
                for course_tee in course.tees or []
                if course_tee.color
            ),
        )

    def _canonicalize_played_tee_box(
        self,
        course: Optional[Course],
        tee_box: Optional[str],
        scan_tees: List[ScannedTee],
    ) -> Optional[str]:
        if not tee_box or not course or not (course.tees or []):
            return tee_box

        exact = course.get_tee(tee_box)
        if exact and exact.color:
            return exact.color

        chosen_scan_tee = next(
            (t for t in scan_tees if t.color and t.color.strip().lower() == tee_box.strip().lower()),
            None,
        )
        if chosen_scan_tee:
            matched = self._best_matching_course_tee_color(course, chosen_scan_tee)
            if matched:
                return matched

        token = self._extract_tee_color_token(tee_box)
        if token:
            for course_tee in course.tees:
                if course_tee.color and self._extract_tee_color_token(course_tee.color) == token:
                    return course_tee.color

        return tee_box


def _messages(error: ValidationError) -> List[str]:
    return [str(item.get("msg", "invalid value")).removeprefix("Value error, ") for item in error.errors()]
