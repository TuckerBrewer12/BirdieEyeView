BEGIN;

UPDATE courses.courses
SET name = INITCAP(LOWER(REGEXP_REPLACE(TRIM(name), '\s+', ' ', 'g')))
WHERE name IS NOT NULL
  AND name <> INITCAP(LOWER(REGEXP_REPLACE(TRIM(name), '\s+', ' ', 'g')));

UPDATE users.rounds
SET course_name_played = INITCAP(LOWER(REGEXP_REPLACE(TRIM(course_name_played), '\s+', ' ', 'g')))
WHERE course_name_played IS NOT NULL
  AND course_name_played <> INITCAP(LOWER(REGEXP_REPLACE(TRIM(course_name_played), '\s+', ' ', 'g')));

COMMIT;
