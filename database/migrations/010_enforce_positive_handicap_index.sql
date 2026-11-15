BEGIN;

UPDATE users.users
SET handicap_index = ABS(handicap_index)
WHERE handicap_index < 0;

UPDATE users.users
SET handicap_index = NULL
WHERE handicap_index = 0;

ALTER TABLE users.users
DROP CONSTRAINT IF EXISTS chk_users_handicap_index_positive;

ALTER TABLE users.users
ADD CONSTRAINT chk_users_handicap_index_positive
CHECK (handicap_index IS NULL OR (handicap_index > 0 AND handicap_index <= 54));

COMMIT;
