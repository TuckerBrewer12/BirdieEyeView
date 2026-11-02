-- PostgreSQL schema aligned with Pydantic domain models

BEGIN;

-- Schemas
CREATE SCHEMA IF NOT EXISTS courses;
CREATE SCHEMA IF NOT EXISTS users;

-- Extensions (for UUIDs and fuzzy text search)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm;

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

-- =============
-- Auto-update updated_at on row modification
-- =============
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============
-- courses.courses
-- =============
-- user_id IS NULL  => master/global course
-- user_id IS NOT NULL => custom course owned by that user
-- user_id FK added via ALTER TABLE at end of schema (circular dependency with users.users)
CREATE TABLE IF NOT EXISTS courses.courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    external_course_id VARCHAR(255),
    location VARCHAR(255),
    par INTEGER CHECK (par BETWEEN 27 AND 108),
    total_holes INTEGER CHECK (total_holes IN (9, 18)),
    user_id UUID,  -- FK added later; NULL = master course
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    metadata JSONB,
    CHECK (par IS NULL OR total_holes IS NULL OR par BETWEEN 3 * total_holes AND 6 * total_holes)
);

CREATE INDEX IF NOT EXISTS idx_courses_location ON courses.courses (location);
CREATE INDEX IF NOT EXISTS idx_courses_name ON courses.courses (name);
CREATE INDEX IF NOT EXISTS idx_courses_external_course_id ON courses.courses (external_course_id);
CREATE INDEX IF NOT EXISTS idx_courses_user_id ON courses.courses (user_id);

-- Partial unique indexes: master courses unique by (name, location),
-- user courses unique by (name, location, user_id)
CREATE UNIQUE INDEX IF NOT EXISTS idx_courses_unique_master
    ON courses.courses (LOWER(name), COALESCE(LOWER(location), '')) WHERE user_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_courses_unique_user
    ON courses.courses (LOWER(name), COALESCE(LOWER(location), ''), user_id) WHERE user_id IS NOT NULL;

CREATE TRIGGER trg_courses_updated_at
    BEFORE UPDATE ON courses.courses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============
-- courses.holes
-- Par and handicap are properties of the hole itself (same regardless of tee).
-- Yardage varies by tee and lives in courses.tee_yardages.
-- =============
CREATE TABLE IF NOT EXISTS courses.holes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID NOT NULL REFERENCES courses.courses(id) ON DELETE CASCADE,
    hole_number INTEGER NOT NULL CHECK (hole_number BETWEEN 1 AND 18),
    par INTEGER CHECK (par BETWEEN 3 AND 6),
    handicap INTEGER CHECK (handicap BETWEEN 1 AND 18),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE (course_id, hole_number),
    UNIQUE (course_id, handicap)
);

CREATE INDEX IF NOT EXISTS idx_holes_course_id ON courses.holes (course_id);
CREATE INDEX IF NOT EXISTS idx_holes_number ON courses.holes (hole_number);

-- =============
-- courses.tees
-- =============
CREATE TABLE IF NOT EXISTS courses.tees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID NOT NULL REFERENCES courses.courses(id) ON DELETE CASCADE,
    color VARCHAR(50) NOT NULL,
    slope_rating DOUBLE PRECISION CHECK (slope_rating BETWEEN 55 AND 155),
    course_rating DOUBLE PRECISION CHECK (course_rating > 0 AND course_rating < 'Infinity'::DOUBLE PRECISION),
    yardage_holes INTEGER[] CHECK (courses.valid_hole_coverage(yardage_holes)),
    rating_holes INTEGER[] CHECK (courses.valid_hole_coverage(rating_holes)),
    total_yardage INTEGER CHECK (total_yardage BETWEEN 0 AND 1000 * COALESCE(cardinality(yardage_holes), 18)),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tees_course_id ON courses.tees (course_id);
CREATE INDEX IF NOT EXISTS idx_tees_color ON courses.tees (color);
CREATE UNIQUE INDEX IF NOT EXISTS idx_tees_unique_course_color_ci
    ON courses.tees (course_id, LOWER(color));

-- =============
-- courses.tee_yardages
-- Per-hole yardage for each tee box. Mirrors Tee.hole_yardages dict.
-- =============
CREATE TABLE IF NOT EXISTS courses.tee_yardages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tee_id UUID NOT NULL REFERENCES courses.tees(id) ON DELETE CASCADE,
    hole_number INTEGER NOT NULL CHECK (hole_number BETWEEN 1 AND 18),
    yardage INTEGER NOT NULL CHECK (yardage BETWEEN 0 AND 1000),
    UNIQUE (tee_id, hole_number)
);

CREATE INDEX IF NOT EXISTS idx_tee_yardages_tee_id ON courses.tee_yardages (tee_id);

-- =============
-- users.users
-- =============
CREATE TABLE IF NOT EXISTS users.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    friend_code VARCHAR(12) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255),
    email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    email_verified_at TIMESTAMP,
    handicap_index NUMERIC(4,1)
        CHECK (handicap_index IS NULL OR (handicap_index >= -10 AND handicap_index <= 54)),
    home_course_id UUID REFERENCES courses.courses(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_handicap_update TIMESTAMP,
    scoring_goal SMALLINT CHECK (scoring_goal BETWEEN 18 AND 270),
    scoring_goal_nine SMALLINT CHECK (scoring_goal_nine BETWEEN 9 AND 135),
    preferences JSONB
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users.users (email);
CREATE INDEX IF NOT EXISTS idx_users_home_course ON users.users (home_course_id);
CREATE INDEX IF NOT EXISTS idx_users_friend_code ON users.users (friend_code);
CREATE INDEX IF NOT EXISTS idx_users_email_verified ON users.users (email_verified);

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============
-- users.auth_tokens
-- One-time tokens used for email verification and password reset.
-- Token values are stored as hashes only.
-- =============
CREATE TABLE IF NOT EXISTS users.auth_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users.users(id) ON DELETE CASCADE,
    token_type VARCHAR(32) NOT NULL CHECK (token_type IN ('email_verify', 'password_reset')),
    token_hash CHAR(64) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    meta JSONB
);

CREATE INDEX IF NOT EXISTS idx_auth_tokens_hash ON users.auth_tokens (token_hash);
CREATE INDEX IF NOT EXISTS idx_auth_tokens_user_type ON users.auth_tokens (user_id, token_type);
CREATE INDEX IF NOT EXISTS idx_auth_tokens_expires_at ON users.auth_tokens (expires_at);

-- =============
-- users.friendships
-- Directed request rows with undirected uniqueness per user-pair.
-- =============
CREATE TABLE IF NOT EXISTS users.friendships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    requester_id UUID NOT NULL REFERENCES users.users(id) ON DELETE CASCADE,
    addressee_id UUID NOT NULL REFERENCES users.users(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'accepted', 'declined', 'blocked')),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CHECK (requester_id <> addressee_id)
);

-- One friendship row max per user-pair regardless of direction.
CREATE UNIQUE INDEX IF NOT EXISTS idx_friendships_unique_pair
    ON users.friendships (
        LEAST(requester_id, addressee_id),
        GREATEST(requester_id, addressee_id)
    );
CREATE INDEX IF NOT EXISTS idx_friendships_requester ON users.friendships (requester_id);
CREATE INDEX IF NOT EXISTS idx_friendships_addressee ON users.friendships (addressee_id);
CREATE INDEX IF NOT EXISTS idx_friendships_status ON users.friendships (status);

CREATE TRIGGER trg_friendships_updated_at
    BEFORE UPDATE ON users.friendships
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============
-- users.rounds
-- =============
CREATE TABLE IF NOT EXISTS users.rounds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users.users(id) ON DELETE CASCADE,
    course_id UUID REFERENCES courses.courses(id) ON DELETE RESTRICT,
    tee_id UUID REFERENCES courses.tees(id) ON DELETE RESTRICT,
    round_date DATE,
    total_score INTEGER CHECK (total_score BETWEEN 1 AND 270),
    adjusted_gross_score INTEGER CHECK (adjusted_gross_score BETWEEN 1 AND 270),
    intended_holes INTEGER[] CHECK (courses.valid_hole_coverage(intended_holes)),
    supplied_total_putts INTEGER CHECK (supplied_total_putts BETWEEN 0 AND 10 * COALESCE(cardinality(intended_holes), 18)),
    supplied_total_gir INTEGER CHECK (supplied_total_gir BETWEEN 0 AND COALESCE(cardinality(intended_holes), 18)),
    score_differential NUMERIC(4,1),
    is_complete BOOLEAN DEFAULT FALSE,
    holes_played INTEGER CHECK (holes_played BETWEEN 1 AND 18),
    weather_conditions VARCHAR(255),
    notes TEXT,
    course_name_played VARCHAR(255),  -- denormalized: used when course_id is NULL
    tee_box_played VARCHAR(100),      -- denormalized: used when tee_id is NULL
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rounds_user_id ON users.rounds (user_id);
CREATE INDEX IF NOT EXISTS idx_rounds_course_id ON users.rounds (course_id);
CREATE INDEX IF NOT EXISTS idx_rounds_date ON users.rounds (round_date);
CREATE INDEX IF NOT EXISTS idx_rounds_user_date ON users.rounds (user_id, round_date DESC);
CREATE INDEX IF NOT EXISTS idx_rounds_differential ON users.rounds (score_differential)
    WHERE score_differential IS NOT NULL;

CREATE TRIGGER trg_rounds_updated_at
    BEFORE UPDATE ON users.rounds
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============
-- users.hole_scores
-- =============
CREATE TABLE IF NOT EXISTS users.hole_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    round_id UUID NOT NULL REFERENCES users.rounds(id) ON DELETE CASCADE,
    hole_id UUID REFERENCES courses.holes(id) ON DELETE RESTRICT,  -- nullable: rounds for unknown courses have no hole FK
    hole_number INTEGER NOT NULL CHECK (hole_number BETWEEN 1 AND 18),
    strokes INTEGER CHECK (strokes BETWEEN 1 AND 15),
    net_score INTEGER,
    played BOOLEAN,
    putts INTEGER CHECK (putts BETWEEN 0 AND 10),
    shots_to_green INTEGER CHECK (shots_to_green BETWEEN 1 AND 10),
    fairway_hit BOOLEAN,
    green_in_regulation BOOLEAN,
    penalties INTEGER DEFAULT 0 CHECK (penalties BETWEEN 0 AND 5),
    par_played INTEGER CHECK (par_played BETWEEN 3 AND 6),          -- par for this hole as played
    handicap_played INTEGER CHECK (handicap_played BETWEEN 1 AND 18),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE (round_id, hole_number),
    CHECK (strokes IS NULL OR putts IS NULL OR putts <= strokes),
    CHECK (strokes IS NULL OR shots_to_green IS NULL OR shots_to_green <= strokes),
    CHECK (played IS DISTINCT FROM FALSE OR strokes IS NULL)
);

CREATE INDEX IF NOT EXISTS idx_hole_scores_round_id ON users.hole_scores (round_id);
CREATE INDEX IF NOT EXISTS idx_hole_scores_hole_id ON users.hole_scores (hole_id);
CREATE INDEX IF NOT EXISTS idx_hole_scores_gir ON users.hole_scores (green_in_regulation)
    WHERE green_in_regulation IS NOT NULL;

-- =============
-- users.user_tees
-- User-owned tee configurations (hybrid tees without cloning a master course)
-- =============
CREATE TABLE IF NOT EXISTS users.user_tees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users.users(id) ON DELETE CASCADE,
    course_id UUID REFERENCES courses.courses(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    slope_rating DOUBLE PRECISION CHECK (slope_rating BETWEEN 55 AND 155),
    course_rating DOUBLE PRECISION CHECK (course_rating > 0 AND course_rating < 'Infinity'::DOUBLE PRECISION),
    hole_yardages JSONB DEFAULT '{}' CHECK (courses.valid_yardages(hole_yardages)),
    yardage_holes INTEGER[] CHECK (courses.valid_hole_coverage(yardage_holes)),
    rating_holes INTEGER[] CHECK (courses.valid_hole_coverage(rating_holes)),
    total_yardage INTEGER CHECK (total_yardage BETWEEN 0 AND 1000 * COALESCE(cardinality(yardage_holes), 18)),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_tees_user_id ON users.user_tees (user_id);
CREATE INDEX IF NOT EXISTS idx_user_tees_course_id ON users.user_tees (course_id);

-- Optional: a round can reference a user_tee instead of a master tee
ALTER TABLE users.rounds
    ADD COLUMN IF NOT EXISTS user_tee_id UUID REFERENCES users.user_tees(id);
CREATE INDEX IF NOT EXISTS idx_rounds_user_tee_id ON users.rounds (user_tee_id);

-- Published range-specific ratings retain explicit hole identity.
CREATE TABLE IF NOT EXISTS courses.tee_ratings (
    tee_id UUID NOT NULL REFERENCES courses.tees(id) ON DELETE CASCADE,
    hole_numbers INTEGER[] NOT NULL CHECK (courses.valid_hole_coverage(hole_numbers)),
    course_rating DOUBLE PRECISION CHECK (course_rating > 0 AND course_rating < 'Infinity'::DOUBLE PRECISION),
    slope_rating DOUBLE PRECISION CHECK (slope_rating BETWEEN 55 AND 155),
    PRIMARY KEY (tee_id, hole_numbers)
);
CREATE TABLE IF NOT EXISTS users.user_tee_ratings (
    tee_id UUID NOT NULL REFERENCES users.user_tees(id) ON DELETE CASCADE,
    hole_numbers INTEGER[] NOT NULL CHECK (courses.valid_hole_coverage(hole_numbers)),
    course_rating DOUBLE PRECISION CHECK (course_rating > 0 AND course_rating < 'Infinity'::DOUBLE PRECISION),
    slope_rating DOUBLE PRECISION CHECK (slope_rating BETWEEN 55 AND 155),
    PRIMARY KEY (tee_id, hole_numbers)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_tees_unique_scope_name
    ON users.user_tees (user_id, course_id, LOWER(name)) NULLS NOT DISTINCT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_courses_external_master
    ON courses.courses (external_course_id) WHERE user_id IS NULL AND external_course_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_courses_external_owner
    ON courses.courses (user_id, external_course_id) WHERE user_id IS NOT NULL AND external_course_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_normalized ON users.users (LOWER(BTRIM(email)));
CREATE INDEX IF NOT EXISTS idx_rounds_stable_history
    ON users.rounds (user_id, round_date DESC NULLS LAST, created_at DESC NULLS LAST, id DESC);

-- =============
-- users.scorecard_scans (raw LLM output)
-- =============
CREATE TABLE IF NOT EXISTS users.scorecard_scans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    round_id UUID REFERENCES users.rounds(id) ON DELETE SET NULL,
    image_path TEXT,
    llm_model TEXT,
    llm_raw_json JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- =============
-- Add user_id FK to courses.courses
-- (Must come after users.users is defined to avoid circular dependency)
-- =============
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'courses' AND table_name = 'courses' AND column_name = 'user_id'
    ) THEN
        ALTER TABLE courses.courses
            ADD COLUMN user_id UUID REFERENCES users.users(id) ON DELETE CASCADE;
    ELSIF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
            ON tc.constraint_name = kcu.constraint_name
        WHERE tc.table_schema = 'courses' AND tc.table_name = 'courses'
          AND tc.constraint_type = 'FOREIGN KEY' AND kcu.column_name = 'user_id'
    ) THEN
        ALTER TABLE courses.courses
            ADD CONSTRAINT courses_user_id_fkey
            FOREIGN KEY (user_id) REFERENCES users.users(id) ON DELETE CASCADE;
    END IF;
END
$$;

COMMIT;
