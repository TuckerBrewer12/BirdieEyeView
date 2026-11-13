"""Stable, user-facing messages for failures caused by internal systems.

Every 5xx reply takes its text from here, never from exception text, so internal details
(SQL, provider errors, file paths) cannot reach the client. Client errors, rate limits and
success replies live in ``api/messages.py``.
"""

# General
UNEXPECTED_ERROR = "Something went wrong. Please try again."
SERVICE_UNAVAILABLE = "Service is temporarily unavailable. Please try again shortly."

# Courses and rounds
COURSE_SAVE_FAILED = "We couldn't save this course. Please try again."
ROUND_SAVE_FAILED = "We couldn't save this round. Please try again."
ROUND_UPDATE_FAILED = "Update failed. Please try again."
ROUND_LINK_FAILED = "Link failed. Please try again."

# Scanning
SCAN_FAILED = "We couldn't scan this scorecard. Please try again."
OCR_FAILED = "OCR failed. Please try again."
EXTRACTION_FAILED = "Extraction failed. Please try again."
SCAN_SAVE_FAILED = "Save failed. Please try again."

# Failed-scan reports
REPORT_STORAGE_UNAVAILABLE = "Reporting is not available yet. Your report was not saved."
REPORT_NOT_SAVED = "Your report was not saved. Please try again."
