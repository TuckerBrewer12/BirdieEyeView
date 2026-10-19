from .base import BaseGolfModel
from .course import Course
from .hole import Hole
from .hole_score import HoleScore
from .round import Round
from .tee import Tee, TeeRating
from .hole_layout import FRONT_NINE, BACK_NINE, FULL_ROUND
from .scoring import SCORE_LABELS, classify_score
from .user import User
from .user_tee import UserTee

# Resolve forward refs like User.rounds -> Round once at import time.
User.model_rebuild()

__all__ = [
    'BaseGolfModel', 'Course', 'Hole', 'HoleScore', 'Round', 'Tee', 'TeeRating', 'User', 'UserTee',
    'FRONT_NINE', 'BACK_NINE', 'FULL_ROUND', 'SCORE_LABELS', 'classify_score',
]
