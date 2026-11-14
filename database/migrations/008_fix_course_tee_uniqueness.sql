BEGIN;

DROP INDEX IF EXISTS idx_courses_unique_master;
CREATE UNIQUE INDEX IF NOT EXISTS idx_courses_unique_master
    ON courses.courses (LOWER(name), COALESCE(LOWER(location), ''))
    WHERE user_id IS NULL;

DROP INDEX IF EXISTS idx_courses_unique_user;
CREATE UNIQUE INDEX IF NOT EXISTS idx_courses_unique_user
    ON courses.courses (LOWER(name), COALESCE(LOWER(location), ''), user_id)
    WHERE user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_tees_unique_course_color_ci
    ON courses.tees (course_id, LOWER(color));

COMMIT;
