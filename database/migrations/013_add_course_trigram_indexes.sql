BEGIN;

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_courses_name_trgm
    ON courses.courses USING GIN (name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_courses_location_trgm
    ON courses.courses USING GIN (location gin_trgm_ops);

COMMIT;
