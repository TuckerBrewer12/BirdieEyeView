BEGIN;

ALTER TABLE courses.courses
    ADD COLUMN IF NOT EXISTS external_course_id VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_courses_external_course_id
    ON courses.courses (external_course_id);

COMMIT;
