-- Corporate Gifting Platform — MySQL schema
-- Run:  mysql -u root -p < schema.sql   (or use the setup script in README)

CREATE DATABASE IF NOT EXISTS corporate_gifting
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE corporate_gifting;

-- Employees. Per the original brief only first name, last name and email
-- were stored; employee_id was added later as an admin-assigned reference
-- code, unique when set. It's required going forward via app-level
-- validation, but stays nullable here so employees created before the
-- field existed aren't broken until an admin edits them in.
CREATE TABLE IF NOT EXISTS employees (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  employee_id VARCHAR(40)  NULL,
  first_name  VARCHAR(80)  NOT NULL,
  last_name   VARCHAR(80)  NOT NULL,
  email       VARCHAR(160) NOT NULL UNIQUE,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_employees_employee_id (employee_id)
) ENGINE=InnoDB;

-- Gifts catalogue shown in the "Gift Collection" step.
CREATE TABLE IF NOT EXISTS gifts (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(120) NOT NULL,
  description VARCHAR(255) NOT NULL,
  image_url   VARCHAR(255) NULL,
  active      TINYINT(1) NOT NULL DEFAULT 1,
  sort_order  INT NOT NULL DEFAULT 0,               -- catalogue display order, set via admin drag-to-reorder
  INDEX idx_gifts_active_sort (active, sort_order)  -- matches the public catalogue's WHERE active = 1 ORDER BY sort_order
) ENGINE=InnoDB;

-- Extra gallery images per gift, shown in the client-side image slider
-- (in addition to the single "cover" gifts.image_url).
CREATE TABLE IF NOT EXISTS gift_images (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  gift_id     INT NOT NULL,
  image_url   VARCHAR(255) NOT NULL,
  title       VARCHAR(160) NULL,                    -- per-image caption (e.g. one hamper item's name)
  sort_order  INT NOT NULL DEFAULT 0,
  CONSTRAINT fk_gift_images_gift FOREIGN KEY (gift_id) REFERENCES gifts(id) ON DELETE CASCADE,
  INDEX idx_gift_images_gift (gift_id)
) ENGINE=InnoDB;

-- One-time passwords for the mandatory email-verification step.
CREATE TABLE IF NOT EXISTS otp_codes (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  email       VARCHAR(160) NOT NULL,
  code        CHAR(5)      NOT NULL,
  expires_at  DATETIME     NOT NULL,
  consumed    TINYINT(1)   NOT NULL DEFAULT 0,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_otp_email_code (email, code)             -- covers both the email-only (request-otp) and email+code (verify-otp) lookups
) ENGINE=InnoDB;

-- Orders placed through the client workflow.
CREATE TABLE IF NOT EXISTS orders (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  order_code     VARCHAR(20) NOT NULL UNIQUE,           -- e.g. ORD-1001
  gift_id        INT NULL,
  gift_name      VARCHAR(120) NOT NULL,
  quantity       INT NOT NULL DEFAULT 1,
  recipient_name VARCHAR(160) NOT NULL,
  last_name      VARCHAR(160) NULL,
  client_email   VARCHAR(160) NOT NULL,                 -- verified email that placed the order
  phone          VARCHAR(40)  NOT NULL,
  employee_id    VARCHAR(40)  NULL,
  entity         VARCHAR(160) NULL,
  address        VARCHAR(255) NOT NULL,
  city           VARCHAR(120) NOT NULL,
  state          VARCHAR(120) NOT NULL,
  pincode        VARCHAR(20)  NOT NULL,
  gift_message   VARCHAR(255) NULL,
  status         ENUM('Submitted','Processing','Completed','Cancelled') NOT NULL DEFAULT 'Submitted',
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at     DATETIME NULL,                         -- soft delete: set when an admin removes an order, cleared on restore
  CONSTRAINT fk_orders_gift FOREIGN KEY (gift_id) REFERENCES gifts(id) ON DELETE SET NULL,
  -- deleted_at is filtered on almost every orders query (admin list, dashboard
  -- KPIs, the employees-list status join), so it leads every composite below
  -- rather than standing alone.
  INDEX idx_orders_deleted_status (deleted_at, status),     -- dashboard KPI counts
  INDEX idx_orders_deleted_created (deleted_at, created_at), -- dashboard's last-7-days + recent orders
  INDEX idx_orders_client_email (client_email, deleted_at)  -- dedupe check, OTP resume flow, employees status join
) ENGINE=InnoDB;

-- Single-row atomic counter for order_code (ORD-<n>). A dedicated counter
-- avoids parsing existing order_code strings for the next number, which is
-- what let corrupted values snowball (e.g. ORD-1005 -> ORD-100511...).
-- Starts at 2000 so the first generated code is ORD-2001.
CREATE TABLE IF NOT EXISTS order_counter (
  id          TINYINT NOT NULL PRIMARY KEY,
  next_number INT NOT NULL
) ENGINE=InnoDB;
INSERT IGNORE INTO order_counter (id, next_number) VALUES (1, 2000);

-- Generated Excel exports of the Orders list, listed in the admin Reports section.
CREATE TABLE IF NOT EXISTS reports (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  filename      VARCHAR(255) NOT NULL,
  file_url      VARCHAR(255) NOT NULL,
  date_from     DATE NULL,
  date_to       DATE NULL,
  status_filter VARCHAR(20) NULL,
  search_filter VARCHAR(160) NULL,
  row_count     INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;
