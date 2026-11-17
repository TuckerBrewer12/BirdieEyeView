from dataclasses import dataclass
from enum import StrEnum, auto
from typing import Dict, List, Literal, Optional

from models import Course
from models.hole import HOLES_PER_NINE, HOLES_PER_ROUND
from models.hole_layout import FULL_ROUND
from services.mistral_scorecard_parser import ParsedScorecardRows

ConfidenceLevel = Literal["high", "medium", "low", "very_low"]
MIN_SCORE_BREAKDOWN_EVIDENCE_HOLES = HOLES_PER_NINE


class ScanNoteKind(StrEnum):
    STROKES_MISREAD = auto()
    STROKES_MISSING = auto()
    TO_PAR_WITHOUT_PAR = auto()
    SIGN_CORRECTED = auto()
    PUTTS_OUT_OF_RANGE = auto()
    PUTTS_EXCEED_STROKES = auto()
    SHOTS_OUT_OF_RANGE = auto()
    SHOTS_EXCEED_STROKES = auto()
    BREAKDOWN_CONFLICT = auto()


@dataclass(frozen=True)
class ScanNote:
    kind: ScanNoteKind
    hole: int | None = None


@dataclass(frozen=True)
class ScanAssembly:
    round: Dict
    notes: List[ScanNote]
    warnings: List[str]


def confidence_level(score: float) -> ConfidenceLevel:
    if score >= 0.85:
        return "high"
    if score >= 0.65:
        return "medium"
    if score >= 0.4:
        return "low"
    return "very_low"


def scan_confidence(
    hole_scores: List[Dict],
    notes: List[ScanNote],
    *,
    round_notes: List[str] | None = None,
) -> Dict:
    doubtful_holes = {note.hole for note in notes if note.kind is ScanNoteKind.BREAKDOWN_CONFLICT}
    hole_conf = []
    present = 0
    for hs in hole_scores:
        hole_num = hs.get("hole_number")
        strokes = hs.get("strokes")
        putts = hs.get("putts")
        gir = hs.get("green_in_regulation")
        strokes_conf = 0.2 if strokes is None else (0.7 if hole_num in doubtful_holes else 0.9)
        putts_conf = 0.85 if putts is not None else 0.25
        gir_conf = 0.8 if gir is not None else 0.3
        overall = min(strokes_conf, putts_conf)
        if strokes is not None:
            present += 1
        hole_conf.append(
            {
                "hole_number": hole_num,
                "fields": {
                    "strokes": {
                        "final_confidence": strokes_conf,
                        "level": confidence_level(strokes_conf),
                        "validation_flags": [],
                    },
                    "putts": {
                        "final_confidence": putts_conf,
                        "level": confidence_level(putts_conf),
                        "validation_flags": [],
                    },
                    "green_in_regulation": {
                        "final_confidence": gir_conf,
                        "level": confidence_level(gir_conf),
                        "validation_flags": [],
                    },
                },
                "overall": overall,
                "level": confidence_level(overall),
            }
        )

    overall = present / len(hole_scores) if hole_scores else 0.0
    overall = max(0.0, overall - min(0.5, (len(notes) + len(round_notes or [])) * 0.02))
    return {
        "overall": overall,
        "level": confidence_level(overall),
        "hole_scores": hole_conf,
    }


def score_breakdown_rows_are_trusted(hole_scores: List[Dict]) -> bool:
    complete = [
        score
        for score in hole_scores
        if score["strokes"] is not None
        and score["putts"] is not None
        and score["shots_to_green"] is not None
    ]
    return (
        len(complete) >= MIN_SCORE_BREAKDOWN_EVIDENCE_HOLES
        and all(
            score["strokes"] == score["shots_to_green"] + score["putts"]
            for score in complete
        )
    )


def assemble_scan(
    parsed: ParsedScorecardRows,
    *,
    course: Course | None,
    to_par_scoring: Optional[bool],
) -> ScanAssembly:
    def _safe_list_attr(name: str):
        value = getattr(parsed, name, [])
        return value if isinstance(value, list) else []

    notes: List[ScanNote] = []

    known_course = course is not None
    hole_numbers = (course.get_expected_holes() or FULL_ROUND) if course is not None else FULL_ROUND
    hole_count = max(hole_numbers)

    course_name = None
    course_location = None
    course_par = None
    course_holes: List[Dict] = []
    course_tees: List[Dict] = []
    hole_par_lookup: Dict[int, Optional[int]] = {}

    if known_course:
        course_name = course.name
        course_location = course.location
        course_par = course.get_par()
        parsed_pars = _safe_list_attr("par_row")
        for i in hole_numbers:
            hole_obj = course.get_hole(i)
            p = hole_obj.par if hole_obj is not None else None
            if p is None and i <= len(parsed_pars):
                parsed_par = parsed_pars[i - 1]
                p = parsed_par if parsed_par is not None and 3 <= parsed_par <= 6 else None
            hcp = hole_obj.handicap if hole_obj is not None else None
            hole_par_lookup[i] = p
            course_holes.append({"number": i, "par": p})
            if hcp is not None:
                course_holes[-1]["handicap"] = hcp
        for tee in (course.tees or []):
            yardages = tee.hole_yardages or {}
            course_tees.append(
                {
                    "color": tee.color,
                    "slope_rating": tee.slope_rating,
                    "course_rating": tee.course_rating,
                    "hole_yardages": {str(k): v for k, v in yardages.items() if v is not None},
                }
            )
    else:
        parsed_pars = list(_safe_list_attr("par_row")[:hole_count])
        while len(parsed_pars) < hole_count:
            parsed_pars.append(None)
        for i in hole_numbers:
            handicap_row = _safe_list_attr("handicap_row")
            handicap = handicap_row[i - 1] if i - 1 < len(handicap_row) else None
            par_i = parsed_pars[i - 1]
            if par_i is not None and not (3 <= par_i <= 6):
                par_i = None
            course_holes.append({"number": i, "par": par_i, "handicap": handicap})
            hole_par_lookup[i] = par_i
        par_vals = [p for p in hole_par_lookup.values() if p is not None]
        if len(par_vals) == HOLES_PER_ROUND:
            course_par = sum(par_vals)
        for tr in _safe_list_attr("tee_rows"):
            yardage_map = {
                str(i + 1): y
                for i, y in enumerate(tr.yardages[:hole_count])
                if y is not None
            }
            course_tees.append(
                {
                    "color": tr.label,
                    "slope_rating": None,
                    "course_rating": None,
                    "hole_yardages": yardage_map,
                }
            )

    score_vals = list(_safe_list_attr("score_row")[:hole_count])
    while len(score_vals) < hole_count:
        score_vals.append(None)
    putt_vals = list(_safe_list_attr("putts_row")[:hole_count])
    while len(putt_vals) < hole_count:
        putt_vals.append(None)
    raw_putt_vals = list(_safe_list_attr("raw_putts_row")[:hole_count])
    while len(raw_putt_vals) < hole_count:
        raw_putt_vals.append(None)
    gir_vals = list(_safe_list_attr("gir_row")[:hole_count])
    while len(gir_vals) < hole_count:
        gir_vals.append(None)
    shots_vals = list(_safe_list_attr("shots_to_green_row")[:hole_count])
    while len(shots_vals) < hole_count:
        shots_vals.append(None)
    raw_shots_vals = list(_safe_list_attr("raw_shots_to_green_row")[:hole_count])
    while len(raw_shots_vals) < hole_count:
        raw_shots_vals.append(None)

    effective_to_par = to_par_scoring if to_par_scoring is not None else (parsed.score_to_par_hint is True)

    hole_scores: List[Dict] = []
    invalid_auxiliary_fields: Dict[int, Dict[str, ScanNote]] = {}
    for i in hole_numbers:
        raw_score = score_vals[i - 1]
        sign_putts = raw_putt_vals[i - 1] if raw_putt_vals[i - 1] is not None else putt_vals[i - 1]
        sign_shots = raw_shots_vals[i - 1] if raw_shots_vals[i - 1] is not None else shots_vals[i - 1]
        if (
            effective_to_par is True
            and raw_score == 1
            and parsed.sign_evidence_trusted
            and sign_shots is not None
            and sign_putts is not None
            and 1 <= sign_shots <= 10
            and 0 <= sign_putts <= 6
            and hole_par_lookup.get(i) is not None
        ):
            est = (sign_shots + sign_putts) - hole_par_lookup[i]  # type: ignore[index]
            if est in (-1, 1):
                if est != raw_score:
                    notes.append(
                        ScanNote(ScanNoteKind.SIGN_CORRECTED, i)
                    )
                raw_score = est

        strokes: Optional[int]
        if raw_score is None:
            strokes = None
            notes.append(ScanNote(ScanNoteKind.STROKES_MISSING, i))
        elif effective_to_par is True:
            par_i = hole_par_lookup.get(i)
            if par_i is None:
                strokes = None
                notes.append(
                    ScanNote(ScanNoteKind.TO_PAR_WITHOUT_PAR, i)
                )
            else:
                converted = par_i + raw_score
                strokes = converted if 1 <= converted <= 15 else None
                if strokes is None:
                    notes.append(ScanNote(ScanNoteKind.STROKES_MISREAD, i))
        else:
            strokes = raw_score if 1 <= raw_score <= 15 else None
            if strokes is None:
                notes.append(ScanNote(ScanNoteKind.STROKES_MISREAD, i))

        invalid_fields: Dict[str, ScanNote] = {}

        putts = putt_vals[i - 1]
        if putts is not None and not (0 <= putts <= 10):
            putts = None
            invalid_fields["putts"] = ScanNote(ScanNoteKind.PUTTS_OUT_OF_RANGE, i)
        if putts is not None and strokes is not None and putts > strokes:
            putts = None
            invalid_fields["putts"] = ScanNote(ScanNoteKind.PUTTS_EXCEED_STROKES, i)

        shots_val = shots_vals[i - 1]
        if shots_val is not None and not (1 <= shots_val <= 10):
            shots_val = None
            invalid_fields["shots_to_green"] = ScanNote(ScanNoteKind.SHOTS_OUT_OF_RANGE, i)
        if shots_val is not None and strokes is not None and shots_val > strokes:
            shots_val = None
            invalid_fields["shots_to_green"] = ScanNote(ScanNoteKind.SHOTS_EXCEED_STROKES, i)

        if invalid_fields:
            invalid_auxiliary_fields[i] = invalid_fields

        hole_scores.append(
            {
                "hole_number": i,
                "strokes": strokes,
                "putts": putts,
                "shots_to_green": shots_val,
                "fairway_hit": None,
                "green_in_regulation": gir_vals[i - 1],
            }
        )

    rows_are_trusted = score_breakdown_rows_are_trusted(hole_scores)
    for score in hole_scores:
        hole_number = score["hole_number"]
        strokes = score["strokes"]
        putts = score["putts"]
        shots_val = score["shots_to_green"]

        if rows_are_trusted and strokes is not None:
            if putts is None and shots_val is not None:
                recovered_putts = strokes - shots_val
                if 0 <= recovered_putts <= 10:
                    score["putts"] = recovered_putts
                    putts = recovered_putts
                    invalid_auxiliary_fields.get(hole_number, {}).pop("putts", None)
            elif shots_val is None and putts is not None:
                recovered_shots = strokes - putts
                if 1 <= recovered_shots <= 10:
                    score["shots_to_green"] = recovered_shots
                    shots_val = recovered_shots
                    invalid_auxiliary_fields.get(hole_number, {}).pop("shots_to_green", None)

        if (
            strokes is not None
            and putts is not None
            and shots_val is not None
            and strokes != shots_val + putts
        ):
            notes.append(
                ScanNote(ScanNoteKind.BREAKDOWN_CONFLICT, hole_number)
            )

        unresolved_fields = invalid_auxiliary_fields.get(hole_number, {})
        notes.extend(unresolved_fields.values())

        if shots_val is None and strokes is not None and putts is not None:
            shots_val = strokes - putts
        if score["green_in_regulation"] is None and shots_val is not None:
            par_i = hole_par_lookup.get(hole_number)
            if par_i is not None:
                score["green_in_regulation"] = shots_val <= max(1, par_i - 2)

    round_payload = {
        "course": {
            "name": course_name,
            "location": course_location,
            "par": course_par,
            "holes": course_holes,
            "tees": course_tees,
        },
        "tee_box": None,
        "date": None,
        "hole_scores": hole_scores,
        "notes": None,
    }
    return ScanAssembly(round=round_payload, notes=notes, warnings=list(parsed.warnings))
