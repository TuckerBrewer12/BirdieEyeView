-- Migration 013: preserve explicit domain context and approved golf bounds.
-- Additive metadata remains unknown on legacy rows. No inferred nine-hole backfill.
BEGIN;

-- Exact model coverage, not an inference from entry counts.
CREATE OR REPLACE FUNCTION courses.valid_hole_coverage(numbers INTEGER[])
RETURNS BOOLEAN LANGUAGE sql IMMUTABLE AS $$
    SELECT numbers IS NULL
        OR numbers = ARRAY[1,2,3,4,5,6,7,8,9]
        OR numbers = ARRAY[10,11,12,13,14,15,16,17,18]
        OR numbers = ARRAY[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18];
$$;

CREATE OR REPLACE FUNCTION courses.valid_yardages(yardages JSONB)
RETURNS BOOLEAN LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
    entry RECORD;
    number INTEGER;
    seen INTEGER[] := '{}';
BEGIN
    IF yardages IS NULL THEN RETURN TRUE; END IF;
    IF jsonb_typeof(yardages) <> 'object' THEN RETURN FALSE; END IF;
    FOR entry IN SELECT * FROM jsonb_each(yardages) LOOP
        IF entry.key !~ '^0*([1-9]|1[0-8])$' THEN RETURN FALSE; END IF;
        number := entry.key::INTEGER;
        IF number = ANY(seen) THEN RETURN FALSE; END IF;
        seen := array_append(seen, number);
        IF jsonb_typeof(entry.value) <> 'number'
           OR entry.value::TEXT !~ '^(0|[1-9][0-9]{0,3})$' THEN
            RETURN FALSE;
        END IF;
        IF entry.value::TEXT::INTEGER > 1000 THEN RETURN FALSE; END IF;
    END LOOP;
    RETURN TRUE;
END;
$$;

DO $$
DECLARE invalid_ids TEXT;
BEGIN
    SELECT string_agg(id::TEXT, ',') INTO invalid_ids
    FROM (SELECT id FROM users.hole_scores
          WHERE (strokes IS NOT NULL AND putts > strokes)
             OR (strokes IS NOT NULL AND shots_to_green > strokes)
          LIMIT 10) bad;
    IF invalid_ids IS NOT NULL THEN
        RAISE EXCEPTION 'Resolve inconsistent hole scores before migration 013; sample IDs: %', invalid_ids;
    END IF;
    SELECT string_agg(id::TEXT, ',') INTO invalid_ids
    FROM (SELECT id FROM courses.courses
          WHERE par IS NOT NULL AND total_holes IS NOT NULL
            AND par NOT BETWEEN 3 * total_holes AND 6 * total_holes
          LIMIT 10) bad;
    IF invalid_ids IS NOT NULL THEN
        RAISE EXCEPTION 'Resolve course par/layout conflicts before migration 013; sample IDs: %', invalid_ids;
    END IF;
    SELECT string_agg(id::TEXT, ',') INTO invalid_ids
    FROM (SELECT id FROM users.user_tees WHERE NOT courses.valid_yardages(hole_yardages) LIMIT 10) bad;
    IF invalid_ids IS NOT NULL THEN
        RAISE EXCEPTION 'Resolve malformed/aliased user tee yardages before migration 013; sample IDs: %', invalid_ids;
    END IF;
    SELECT string_agg(id::TEXT, ',') INTO invalid_ids
    FROM (SELECT id FROM users.users WHERE scoring_goal NOT BETWEEN 18 AND 270 LIMIT 10) bad;
    IF invalid_ids IS NOT NULL THEN
        RAISE EXCEPTION 'Resolve out-of-range goals before migration 013; sample IDs: %', invalid_ids;
    END IF;
END;
$$;

ALTER TABLE courses.courses DROP CONSTRAINT IF EXISTS courses_par_check;
ALTER TABLE courses.courses
    ADD CHECK (par BETWEEN 27 AND 108),
    ADD CHECK (par IS NULL OR total_holes IS NULL OR par BETWEEN 3 * total_holes AND 6 * total_holes);
ALTER TABLE courses.tee_yardages DROP CONSTRAINT IF EXISTS tee_yardages_yardage_check;
ALTER TABLE courses.tee_yardages ADD CHECK (yardage BETWEEN 0 AND 1000);

ALTER TABLE courses.tees DROP CONSTRAINT IF EXISTS tees_course_rating_check;
ALTER TABLE courses.tees DROP CONSTRAINT IF EXISTS tees_slope_rating_check;
ALTER TABLE courses.tees ALTER COLUMN course_rating TYPE DOUBLE PRECISION;
ALTER TABLE courses.tees ALTER COLUMN slope_rating TYPE DOUBLE PRECISION;
ALTER TABLE courses.tees
    ADD CHECK (slope_rating BETWEEN 55 AND 155),
    ADD CHECK (course_rating > 0 AND course_rating < 'Infinity'::DOUBLE PRECISION),
    ADD COLUMN yardage_holes INTEGER[] CHECK (courses.valid_hole_coverage(yardage_holes)),
    ADD COLUMN rating_holes INTEGER[] CHECK (courses.valid_hole_coverage(rating_holes)),
    ADD COLUMN total_yardage INTEGER CHECK (total_yardage BETWEEN 0 AND 1000 * COALESCE(cardinality(yardage_holes), 18));

ALTER TABLE users.users
    ADD CHECK (scoring_goal BETWEEN 18 AND 270),
    ADD COLUMN scoring_goal_nine SMALLINT CHECK (scoring_goal_nine BETWEEN 9 AND 135);

ALTER TABLE users.rounds DROP CONSTRAINT IF EXISTS rounds_total_score_check;
ALTER TABLE users.rounds DROP CONSTRAINT IF EXISTS rounds_adjusted_gross_score_check;
ALTER TABLE users.rounds
    ADD CHECK (total_score BETWEEN 1 AND 270),
    ADD CHECK (adjusted_gross_score BETWEEN 1 AND 270),
    ADD COLUMN intended_holes INTEGER[] CHECK (courses.valid_hole_coverage(intended_holes)),
    ADD COLUMN supplied_total_putts INTEGER CHECK (supplied_total_putts BETWEEN 0 AND 10 * COALESCE(cardinality(intended_holes), 18)),
    ADD COLUMN supplied_total_gir INTEGER CHECK (supplied_total_gir BETWEEN 0 AND COALESCE(cardinality(intended_holes), 18));

ALTER TABLE users.hole_scores DROP CONSTRAINT IF EXISTS hole_scores_net_score_check;
ALTER TABLE users.hole_scores
    ADD COLUMN played BOOLEAN,
    ADD CHECK (strokes IS NULL OR putts IS NULL OR putts <= strokes),
    ADD CHECK (strokes IS NULL OR shots_to_green IS NULL OR shots_to_green <= strokes),
    ADD CHECK (played IS DISTINCT FROM FALSE OR strokes IS NULL);

ALTER TABLE users.user_tees DROP CONSTRAINT IF EXISTS user_tees_course_rating_check;
ALTER TABLE users.user_tees DROP CONSTRAINT IF EXISTS user_tees_slope_rating_check;
ALTER TABLE users.user_tees ALTER COLUMN course_rating TYPE DOUBLE PRECISION;
ALTER TABLE users.user_tees ALTER COLUMN slope_rating TYPE DOUBLE PRECISION;
ALTER TABLE users.user_tees
    ADD CHECK (slope_rating BETWEEN 55 AND 155),
    ADD CHECK (course_rating > 0 AND course_rating < 'Infinity'::DOUBLE PRECISION),
    ADD CHECK (courses.valid_yardages(hole_yardages)),
    ADD COLUMN yardage_holes INTEGER[] CHECK (courses.valid_hole_coverage(yardage_holes)),
    ADD COLUMN rating_holes INTEGER[] CHECK (courses.valid_hole_coverage(rating_holes)),
    ADD COLUMN total_yardage INTEGER CHECK (total_yardage BETWEEN 0 AND 1000 * COALESCE(cardinality(yardage_holes), 18));

-- Published range-specific ratings retain explicit hole identity.
CREATE TABLE courses.tee_ratings (
    tee_id UUID NOT NULL REFERENCES courses.tees(id) ON DELETE CASCADE,
    hole_numbers INTEGER[] NOT NULL CHECK (courses.valid_hole_coverage(hole_numbers)),
    course_rating DOUBLE PRECISION CHECK (course_rating > 0 AND course_rating < 'Infinity'::DOUBLE PRECISION),
    slope_rating DOUBLE PRECISION CHECK (slope_rating BETWEEN 55 AND 155),
    PRIMARY KEY (tee_id, hole_numbers)
);
CREATE TABLE users.user_tee_ratings (
    tee_id UUID NOT NULL REFERENCES users.user_tees(id) ON DELETE CASCADE,
    hole_numbers INTEGER[] NOT NULL CHECK (courses.valid_hole_coverage(hole_numbers)),
    course_rating DOUBLE PRECISION CHECK (course_rating > 0 AND course_rating < 'Infinity'::DOUBLE PRECISION),
    slope_rating DOUBLE PRECISION CHECK (slope_rating BETWEEN 55 AND 155),
    PRIMARY KEY (tee_id, hole_numbers)
);

COMMIT;
