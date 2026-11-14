-- Migration 014: scoped identities and stable history order.
-- Preflight conflicts; never silently delete or merge existing rows.
BEGIN;
DO $$
DECLARE conflicting_scopes BIGINT;
BEGIN
    SELECT COUNT(*) INTO conflicting_scopes FROM (
        SELECT 1 FROM users.user_tees
        GROUP BY user_id, course_id, LOWER(name) HAVING COUNT(*) > 1
    ) duplicates;
    IF conflicting_scopes > 0 THEN
        RAISE EXCEPTION 'Duplicate user tee names in % owner/course scopes; resolve before migration 014', conflicting_scopes;
    END IF;
    SELECT COUNT(*) INTO conflicting_scopes FROM (
        SELECT 1 FROM courses.courses WHERE external_course_id IS NOT NULL
        GROUP BY user_id, external_course_id HAVING COUNT(*) > 1
    ) duplicates;
    IF conflicting_scopes > 0 THEN
        RAISE EXCEPTION 'Duplicate provider course IDs in % master/owner scopes; resolve before migration 014', conflicting_scopes;
    END IF;
    SELECT COUNT(*) INTO conflicting_scopes FROM (
        SELECT 1 FROM users.users GROUP BY LOWER(BTRIM(email)) HAVING COUNT(*) > 1
    ) duplicates;
    IF conflicting_scopes > 0 THEN
        RAISE EXCEPTION 'Conflicting normalized account emails in % groups; resolve before migration 014', conflicting_scopes;
    END IF;
END;
$$;
ALTER TABLE users.user_tees DROP CONSTRAINT IF EXISTS user_tees_user_id_course_id_name_key;
CREATE UNIQUE INDEX idx_user_tees_unique_scope_name
    ON users.user_tees (user_id, course_id, LOWER(name)) NULLS NOT DISTINCT;
CREATE UNIQUE INDEX idx_courses_external_master
    ON courses.courses (external_course_id) WHERE user_id IS NULL AND external_course_id IS NOT NULL;
CREATE UNIQUE INDEX idx_courses_external_owner
    ON courses.courses (user_id, external_course_id) WHERE user_id IS NOT NULL AND external_course_id IS NOT NULL;
CREATE UNIQUE INDEX idx_users_email_normalized ON users.users (LOWER(BTRIM(email)));
CREATE INDEX idx_rounds_stable_history
    ON users.rounds (user_id, round_date DESC NULLS LAST, created_at DESC NULLS LAST, id DESC);
COMMIT;
