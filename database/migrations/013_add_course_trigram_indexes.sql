-- Migration 013: trigram indexes for course search
-- Course search and fuzzy name lookup filter with name/location ILIKE '%q%'
-- and name % q, which a btree index can't serve. GIN trigram indexes let them
-- skip the sequential scan. pg_trgm is already enabled by schema.sql.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_courses_name_trgm
    ON courses.courses USING GIN (name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_courses_location_trgm
    ON courses.courses USING GIN (location gin_trgm_ops);

COMMIT;
