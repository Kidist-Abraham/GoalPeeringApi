CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    userName VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE goals (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_by INT REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING', 

    CONSTRAINT fk_user_creator
        FOREIGN KEY (created_by)
        REFERENCES users (id)
        ON DELETE CASCADE
);

CREATE TABLE goal_votes (
    id SERIAL PRIMARY KEY,
    goal_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    vote_value SMALLINT NOT NULL,  -- -1 or +1
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_goal_vote
        FOREIGN KEY (goal_id)
        REFERENCES goals (id)
        ON DELETE CASCADE,

    CONSTRAINT fk_user_goal_vote
        FOREIGN KEY (user_id)
        REFERENCES users (id)
        ON DELETE CASCADE,

    CONSTRAINT unique_goal_user_vote
        UNIQUE (goal_id, user_id)
);

CREATE TABLE goal_members (
    id SERIAL PRIMARY KEY,
    goal_id INTEGER NOT NULL,
    user_id  INTEGER NOT NULL,
    role VARCHAR(50) DEFAULT 'member',  -- Possible roles: 'member', 'admin', ...
    joined_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) NOT NULL DEFAULT 'JOINED',

    CONSTRAINT fk_goal
        FOREIGN KEY (goal_id) 
        REFERENCES goals (id)
        ON DELETE CASCADE,

    CONSTRAINT fk_user
        FOREIGN KEY (user_id)
        REFERENCES users (id)
        ON DELETE CASCADE
);

CREATE TABLE tips (
    id SERIAL PRIMARY KEY,
    goal_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_goal_tip
        FOREIGN KEY (goal_id)
        REFERENCES goals (id)
        ON DELETE CASCADE,

    CONSTRAINT fk_user_tip
        FOREIGN KEY (user_id)
        REFERENCES users (id)
        ON DELETE CASCADE
);

CREATE TABLE tip_votes (
    id SERIAL PRIMARY KEY,
    tip_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    vote_value SMALLINT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_tip_vote
        FOREIGN KEY (tip_id)
        REFERENCES tips (id)
        ON DELETE CASCADE,

    CONSTRAINT fk_user_vote
        FOREIGN KEY (user_id)
        REFERENCES users (id)
        ON DELETE CASCADE,

    CONSTRAINT unique_tip_user_vote 
        UNIQUE (tip_id, user_id)
);


CREATE TABLE success_stories (
    id SERIAL PRIMARY KEY,
    goal_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_goal_success
        FOREIGN KEY (goal_id)
        REFERENCES goals (id)
        ON DELETE CASCADE,

    CONSTRAINT fk_user_success
        FOREIGN KEY (user_id)
        REFERENCES users (id)
        ON DELETE CASCADE
);

CREATE TABLE chat_messages (
    id SERIAL PRIMARY KEY,
    goal_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    message_text TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_goal_message
        FOREIGN KEY (goal_id)
        REFERENCES goals (id)
        ON DELETE CASCADE,

    CONSTRAINT fk_user_message
        FOREIGN KEY (user_id)
        REFERENCES users (id)
        ON DELETE CASCADE
);
