-- =========================================
-- CREATE DATABASE
-- =========================================
CREATE DATABASE smart_queue_management;

USE smart_queue_management;

-- =========================================
-- USERS TABLE
-- =========================================
CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    phone VARCHAR(15),
    role ENUM('Student', 'Staff', 'Admin') NOT NULL
);

-- =========================================
-- Queue TABLE
-- =========================================
CREATE TABLE queue (
    queue_id INT AUTO_INCREMENT PRIMARY KEY,
    queue_name VARCHAR(100) NOT NULL,
    current_token INT DEFAULT 0
);
INSERT INTO queue(queue_name, current_token)
VALUES
('Administration office', 0),
('Emergency Clinic', 0),
('Technical Help Desk', 0);
-- =========================================
-- TOKEN TABLE
-- =========================================
CREATE TABLE token (
    token_id INT AUTO_INCREMENT PRIMARY KEY,
    token_number INT NOT NULL,

    user_id INT NOT NULL,
    queue_id INT NOT NULL,

    issue_time DATETIME DEFAULT CURRENT_TIMESTAMP,

    status ENUM(
        'Waiting',
        'Serving',
        'Completed',
        'Skipped'
    ) DEFAULT 'Waiting',

    FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE,

    FOREIGN KEY (queue_id)
        REFERENCES queue(queue_id)
        ON DELETE CASCADE
);

-- =========================================
-- NOTIFICATION TABLE
-- =========================================
CREATE TABLE notification (
    notification_id INT AUTO_INCREMENT PRIMARY KEY,

    user_id INT NOT NULL,

    message TEXT NOT NULL,

    sent_time DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE
);

-- =========================================
-- SERVICE HISTORY TABLE
-- =========================================
CREATE TABLE service_history (
    service_id INT AUTO_INCREMENT PRIMARY KEY,

    token_id INT UNIQUE NOT NULL,

    start_time DATETIME NOT NULL,
    end_time DATETIME NOT NULL,

    waiting_time INT,
    service_duration INT,

    FOREIGN KEY (token_id)
        REFERENCES token(token_id)
        ON DELETE CASCADE
);
select * from service_history;