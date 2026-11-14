BEGIN;

ALTER TABLE users.hole_scores ALTER COLUMN hole_id DROP NOT NULL;

ALTER TABLE users.hole_scores
    ADD COLUMN IF NOT EXISTS par_played INTEGER CHECK (par_played BETWEEN 3 AND 6);
ALTER TABLE users.hole_scores
    ADD COLUMN IF NOT EXISTS handicap_played INTEGER CHECK (handicap_played BETWEEN 1 AND 18);

ALTER TABLE users.rounds
    ADD COLUMN IF NOT EXISTS course_name_played VARCHAR(255);

CREATE TABLE IF NOT EXISTS users.user_tees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users.users(id) ON DELETE CASCADE,
    course_id UUID REFERENCES courses.courses(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    slope_rating NUMERIC(4,1) CHECK (slope_rating BETWEEN 55 AND 155),
    course_rating NUMERIC(4,1) CHECK (course_rating BETWEEN 55 AND 85),
    hole_yardages JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE (user_id, course_id, name)
);

ALTER TABLE users.rounds
    ADD COLUMN IF NOT EXISTS user_tee_id UUID REFERENCES users.user_tees(id);

COMMIT;
