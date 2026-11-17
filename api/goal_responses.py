from typing import Any, Dict

from api.schemas import GoalReportResponse


def saver_response(saver: Dict[str, Any]) -> Dict[str, Any]:
    data = saver["data"]
    presentations = {
        "three_putt_bleed": lambda: ("Cut out 3-putts", f"{data['avg_three_putts']:.1f} a round"),
        "blowup_holes": lambda: ("Turn doubles into bogeys", f"{data['avg_doubles'] + data['avg_triples_plus']:.1f} doubles or worse a round"),
        "achilles_heel": lambda: (f"Par {data['par']}s from {data['bucket_label']} yds", f"+{data['average_to_par']:.1f} a hole from there"),
        "home_course_demon": lambda: (f"Hole {data['hole_number']} at home", f"+{data['average_to_par']:.1f} a round on it"),
        "gir_opportunity": lambda: ("Hit more greens", f"{data['gir_percentage']:.0f}% of greens"),
        "scrambling_opportunity": lambda: ("Save more pars after a miss", f"{data['scrambling_percentage']:.0f}% scrambling"),
        "par5_opportunity": lambda: ("Score on par 5s", f"+{data['average_to_par']:.1f} a hole on them"),
    }
    headline, detail = presentations[saver["type"]]()
    return {**saver, "headline": headline, "detail": detail}


def goal_report_response(report: Dict[str, Any]) -> GoalReportResponse:
    return GoalReportResponse.model_validate({**report, "savers": [saver_response(s) for s in report["savers"]]})
