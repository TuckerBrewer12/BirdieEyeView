BEGIN;

ALTER TABLE courses.courses
    ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users.users(id) ON DELETE CASCADE;

ALTER TABLE courses.courses
    DROP CONSTRAINT IF EXISTS courses_name_location_key;

CREATE INDEX IF NOT EXISTS idx_courses_user_id ON courses.courses (user_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_courses_unique_master
    ON courses.courses (LOWER(name), location) WHERE user_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_courses_unique_user
    ON courses.courses (LOWER(name), location, user_id) WHERE user_id IS NOT NULL;

COMMIT;
