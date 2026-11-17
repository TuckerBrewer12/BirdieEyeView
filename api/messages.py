FORBIDDEN = "Forbidden"
NOT_AUTHENTICATED = "Not authenticated"
INVALID_OR_EXPIRED_TOKEN = "Invalid or expired token"
INVALID_CREDENTIALS = "Invalid email or password"
EMAIL_NOT_VERIFIED = "Email not verified. Please verify your email before signing in."
INVALID_VERIFICATION_TOKEN = "Invalid or expired verification token"
INVALID_RESET_TOKEN = "Invalid or expired reset token"
EMAIL_ALREADY_REGISTERED = "An account with this email already exists"
EXTERNAL_LOOKUP_REQUIRES_AUTH = "Authentication required for external course lookup"

ACCOUNT_CREATED = "Account created. Check your email to verify your account before signing in."
EMAIL_VERIFIED = "Email verified. You can now sign in."
VERIFICATION_SENT_IF_ACCOUNT_EXISTS = "If this account exists, a verification email has been sent."
LOGGED_OUT = "Logged out."
RESET_LINK_SENT_IF_ACCOUNT_EXISTS = "If this account exists, a password reset link has been sent."
PASSWORD_RESET_COMPLETE = "Password has been reset. You can now sign in."

TOO_MANY_REQUESTS = "Too many requests. Please slow down."
TOO_MANY_UNAUTHENTICATED_REQUESTS = "Too many unauthenticated requests."
TOO_MANY_REPORTS = "Too many reports. Please try again later."
SCAN_LIMIT_REACHED = "Scorecard scan limit reached. Please try again later."
ENDPOINT_RATE_EXCEEDED = "Request rate exceeded for this endpoint."
AUTOMATED_TRAFFIC_LIMIT = "Automated traffic limit reached."
TOO_MANY_AI_REQUESTS = "Too many AI insight requests. Please try again later."
TOO_MANY_AI_REQUESTS_FOR_ACCOUNT = "Too many AI insight requests for this account. Please try again later."
TOO_MANY_SIGNUPS = "Too many account creation attempts. Please try again later."
TOO_MANY_SIGNUPS_FOR_EMAIL = "Too many account creation attempts for this email. Please try again later."
TOO_MANY_VERIFICATION_RESENDS = "Too many verification resend attempts. Please try again later."
TOO_MANY_VERIFICATION_RESENDS_FOR_EMAIL = "Too many verification resend attempts for this email. Please try again later."
TOO_MANY_LOGIN_REQUESTS = "Too many login requests. Please try again shortly."
TOO_MANY_LOGIN_ATTEMPTS = "Too many login attempts. Please try again shortly."
TOO_MANY_RESET_ATTEMPTS = "Too many reset attempts. Please try again later."

USER_NOT_FOUND = "User not found"
HOME_COURSE_NOT_FOUND = "Selected home course was not found"
NO_SCORING_GOAL = "No scoring goal set"
FRIEND_CODE_NOT_FOUND = "Friend code not found"
FRIENDSHIP_NOT_FOUND = "Friendship not found or action not permitted"

USER_TEE_NOT_FOUND = "User tee not found"
USER_TEE_EXISTS = "User tee '{name}' already exists for this course"
USER_TEE_NAME_TAKEN = "A user tee with that name already exists for this course"
USER_TEE_IN_USE = "This tee is used by past rounds and cannot be deleted"
USER_TEE_INVALID = "These tee details aren't valid. Check the linked course, ratings and yardages, then try again."
LINKED_COURSE_NOT_FOUND = "Linked course was not found"

COURSE_NOT_FOUND = "Course not found"
COURSE_ID_NOT_FOUND = "Course {course_id} not found"
COURSE_NOT_FOUND_OR_NOT_OWNED = "Course not found or not owned by user"
SOURCE_COURSE_NOT_FOUND = "Source course not found"
COURSE_DATA_INVALID = "Course data is invalid."
COURSE_CHANGES_INVALID = "These course changes are invalid."
COURSE_NAME_TAKEN = "A course with that name already exists for this user"
MASTER_COURSE_READ_ONLY = "Cannot edit a master course. Clone it first."
COURSE_ALREADY_CLONED = "You already have a custom copy of this course"
COURSE_PROVIDER_ID_TAKEN = "Another of your courses is already linked to that course."
COURSE_PAR_FROM_HOLES = "This course's par comes from its holes, so it can't be set directly."

ROUND_NOT_FOUND = "Round not found"
ROUND_NOT_IN_HISTORY = "Round not found in user history"
NO_ROUNDS_FOUND = "No rounds found"
ROUND_CHANGES_INVALID = "These changes can't be saved. Check the hole numbers and scores."
ROUND_HOLES_DONT_MATCH_COURSE = "This round's holes don't match the selected course."

FILENAME_REQUIRED = "Filename is required."
HEIC_UNAVAILABLE = "HEIC uploads are temporarily unavailable on this server. Please convert to JPG/PNG and retry."
UNSUPPORTED_FILE_TYPE = "Unsupported file type: {suffix}. Allowed: {allowed}"
UNSUPPORTED_CONTENT_TYPE = "Unsupported upload content type: {content_type}"
UNSUPPORTED_IMAGE_FORMAT = "Unsupported image format: {format}"
INVALID_PDF = "Invalid PDF upload."
INVALID_IMAGE_DIMENSIONS = "Invalid image dimensions."
IMAGE_DIMENSIONS_TOO_LARGE = "Image dimensions exceed allowed size."
IMAGE_PIXELS_TOO_MANY = "Image pixel count exceeds allowed size."
UNREADABLE_IMAGE = "Invalid or unreadable image upload."
FILE_TOO_LARGE = "File too large. Maximum size is 20 MB."
UPLOAD_NOT_PROCESSED = "Uploaded file could not be processed"

UNCLEAR_PLAYER_NAME = (
    "Name is unclear in the scorecard image. Please upload a cleaner image with clearer handwriting and try again."
)
UNREADABLE_SCORE_ROWS = (
    "Unable to clearly read the score rows from this image. Please upload a cleaner image with clearer handwriting "
    "and better lighting, then try again."
)
PLAYER_NAME_NOT_READ = (
    "Your name could not be read on the card, so these scores come from the only unlabeled row. "
    "Please check they are yours."
)

REPORT_FIELDS_NOT_ALLOWED = "Only a scorecard and report metadata are accepted."
REPORT_METADATA_INVALID = "Invalid report metadata."
REPORT_FILE_TYPE_UNSUPPORTED = "Unsupported scorecard file type."
REPORT_FILE_REJECTED = "This file cannot be reported. Use a supported scorecard up to 20 MB."

INVALID_EMAIL_FORMAT = 'Invalid email format.'

CANNOT_FRIEND_YOURSELF = 'Cannot friend yourself'

USERS_ARE_ALREADY_FRIENDS = 'Users are already friends'

FRIEND_REQUEST_BLOCKED_FOR_THIS_PAIR = 'Friend request blocked for this pair'

INVALID_FRIENDSHIP_STATUS = 'Invalid friendship status'

FRIEND_ID_IS_REQUIRED = 'friend_id is required'

NO_BENCHMARK_FOR_THAT_HANDICAP = 'No benchmark for that handicap'

COURSE_ID_MUST_BE_A_VALID_UUID = 'course_id must be a valid UUID.'

Q_MUST_BE_PLAIN_TEXT_OF_AT_MOST_120_CHARACTERS = 'q must be plain text of at most 120 characters.'

USER_CONTEXT_INVALID = "user_context must be plain text of at most {limit} characters."

OCR_TEXT_INVALID = "ocr_text must be plain text of at most {limit} characters."

OCR_TEXT_TOO_LONG = "This file has more text than a scorecard. Try a photo of just the card."

SCAN_REVIEW_NOTES = {
    "strokes_misread": "Hole {hole} score couldn't be read; check it",
    "strokes_missing": "Hole {hole} strokes missing",
    "to_par_without_par": "Hole {hole} cannot convert to-par score without known par",
    "sign_corrected": "Hole {hole} score sign corrected (birdie vs bogey disambiguated)",
    "putts_out_of_range": "Hole {hole} putts out of range",
    "putts_exceed_strokes": "Hole {hole} putts exceed strokes",
    "shots_out_of_range": "Hole {hole} shots to green out of range",
    "shots_exceed_strokes": "Hole {hole} shots to green exceed strokes",
    "breakdown_conflict": "Hole {hole} score breakdown conflicts with total strokes",
}
