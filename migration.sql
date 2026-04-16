SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE IF NOT EXISTS provinces (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  province_name VARCHAR(100) NOT NULL,
  province_code VARCHAR(10) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_provinces_name (province_name),
  UNIQUE KEY uq_provinces_code (province_code),
  KEY idx_province_code (province_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS wards (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  ward_name VARCHAR(100) NOT NULL,
  ward_type VARCHAR(20) NOT NULL,
  ward_code VARCHAR(100) NOT NULL,
  province_id INT UNSIGNED NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_wards_code (ward_code),
  KEY idx_wards_province_id (province_id),
  CONSTRAINT fk_wards_province_id FOREIGN KEY (province_id) REFERENCES provinces (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS agency (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  province_id INT UNSIGNED NOT NULL,
  agency_name VARCHAR(200) NOT NULL,
  avatar VARCHAR(255) NULL,
  identity_number VARCHAR(20) NOT NULL,
  tax_code VARCHAR(20) NULL,
  ward_id INT UNSIGNED NOT NULL,
  address TEXT NULL,
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(100) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_agency_identity_number (identity_number),
  KEY idx_agency_ward_active (ward_id, is_active),
  KEY idx_agency_is_active (is_active),
  CONSTRAINT fk_agency_ward_id FOREIGN KEY (ward_id) REFERENCES wards (id),
  CONSTRAINT fk_agency_province_id FOREIGN KEY (province_id) REFERENCES provinces (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS bank_account (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  agency_id INT UNSIGNED NOT NULL,
  account_number VARCHAR(255) NOT NULL,
  bank_name VARCHAR(255) NOT NULL,
  account_name VARCHAR(255) NOT NULL,
  active INT NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_bank_account_agency_active (agency_id, active),
  KEY idx_bank_account_agency_id (agency_id),
  CONSTRAINT fk_bank_account_agency_id FOREIGN KEY (agency_id) REFERENCES agency (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS strategy (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  strategy_name VARCHAR(255) NOT NULL,
  agency_id INT UNSIGNED NOT NULL,
  amount_per_unit DECIMAL(11,2) NOT NULL DEFAULT 1000.00,
  op_per_unit INT NOT NULL DEFAULT 60,
  foam_per_unit INT NOT NULL DEFAULT 6,
  enabled TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_strategy_agency_enabled (agency_id, enabled),
  KEY idx_strategy_agency_id (agency_id),
  CONSTRAINT fk_strategy_agency_id FOREIGN KEY (agency_id) REFERENCES agency (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS stations (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  station_name VARCHAR(20) NOT NULL,
  address TEXT NULL,
  latitude DECIMAL(10,8) NULL,
  longitude DECIMAL(11,8) NULL,
  province_id INT UNSIGNED NOT NULL,
  ward_id INT UNSIGNED NOT NULL,
  agency_id INT UNSIGNED NOT NULL,
  transfer_prefix VARCHAR(10) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  bank_account_id INT UNSIGNED NULL,
  strategy_id INT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_stations_name (station_name),
  UNIQUE KEY uq_stations_transfer_prefix (transfer_prefix),
  KEY idx_stations_province_active (province_id, is_active),
  KEY idx_stations_ward_active (ward_id, is_active),
  KEY idx_stations_agency_active (agency_id, is_active),
  KEY idx_stations_bank_account_id (bank_account_id),
  KEY idx_stations_strategy_id (strategy_id),
  CONSTRAINT fk_stations_province_id FOREIGN KEY (province_id) REFERENCES provinces (id),
  CONSTRAINT fk_stations_ward_id FOREIGN KEY (ward_id) REFERENCES wards (id),
  CONSTRAINT fk_stations_agency_id FOREIGN KEY (agency_id) REFERENCES agency (id),
  CONSTRAINT fk_stations_bank_account_id FOREIGN KEY (bank_account_id) REFERENCES bank_account (id) ON DELETE SET NULL,
  CONSTRAINT fk_stations_strategy_id FOREIGN KEY (strategy_id) REFERENCES strategy (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS wash_bays (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  bay_code VARCHAR(20) NOT NULL,
  bay_status INT NOT NULL DEFAULT 1,
  station_id INT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_wash_bays_station_status (station_id, bay_status),
  KEY idx_wash_bays_code (bay_code),
  KEY idx_wash_bays_station_code (station_id, bay_code),
  CONSTRAINT fk_wash_bays_station_id FOREIGN KEY (station_id) REFERENCES stations (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS transactions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  transaction_id VARCHAR(128) NOT NULL,
  original_payload JSON NULL,
  amount DECIMAL(12,2) NOT NULL,
  content VARCHAR(255) NOT NULL,
  account_number VARCHAR(64) NULL,
  station_id INT UNSIGNED NULL,
  bay_id INT UNSIGNED NULL,
  bay_code VARCHAR(16) NULL,
  op INT NULL,
  foam INT NULL,
  mqtt_topic VARCHAR(128) NULL,
  mqtt_payload TEXT NULL,
  source ENUM('webhook','sepay','manual') NOT NULL DEFAULT 'webhook',
  status ENUM('processed','failed','ignored') NOT NULL DEFAULT 'processed',
  is_test TINYINT(1) NOT NULL DEFAULT 0,
  transaction_time DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_transactions_transaction_id (transaction_id),
  KEY idx_station (station_id),
  KEY idx_is_test (is_test),
  KEY idx_created_at (created_at),
  KEY idx_transactions_bay_id (bay_id),
  KEY idx_transactions_bay_datetime (bay_id, transaction_time),
  KEY idx_transactions_amount_date (amount, created_at),
  KEY idx_tx_status_test_trxtime_station (status, is_test, transaction_time, station_id),
  KEY idx_tx_status_test_created_station (status, is_test, created_at, station_id),
  CONSTRAINT fk_transactions_station_id FOREIGN KEY (station_id) REFERENCES stations (id),
  CONSTRAINT fk_transactions_bay_id FOREIGN KEY (bay_id) REFERENCES wash_bays (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS test_transactions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  transaction_id VARCHAR(128) NOT NULL,
  transaction_ref VARCHAR(128) NULL,
  amount DECIMAL(12,2) NOT NULL,
  content VARCHAR(255) NOT NULL,
  account_number VARCHAR(64) NULL,
  station_id INT UNSIGNED NULL,
  bay_code VARCHAR(16) NULL,
  op INT NULL,
  foam INT NULL,
  mqtt_topic VARCHAR(128) NULL,
  mqtt_payload TEXT NULL,
  transaction_time DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  notes TEXT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_test_transactions_transaction_id (transaction_id),
  KEY idx_test_station (station_id),
  KEY idx_test_created_at (created_at),
  KEY idx_test_transactions_bay_code (bay_code),
  KEY idx_test_transactions_time (transaction_time),
  CONSTRAINT fk_test_transactions_station_id FOREIGN KEY (station_id) REFERENCES stations (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS processed_webhooks (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  dedupe_key VARCHAR(256) NOT NULL,
  transaction_id VARCHAR(128) NULL,
  payload JSON NULL,
  processed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expire_at DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_processed_webhooks_dedupe_key (dedupe_key),
  KEY idx_processed_at (processed_at),
  KEY idx_processed_webhooks_expire (expire_at),
  KEY idx_processed_webhooks_cleanup (processed_at, expire_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS mqtt_settings (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  station_id INT UNSIGNED NULL,
  broker_url VARCHAR(255) NOT NULL,
  user VARCHAR(128) NULL,
  pass_hash VARCHAR(256) NULL,
  client_id VARCHAR(128) NULL,
  extra JSON NULL,
  enabled TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_mqtt_settings_station_enabled (station_id, enabled),
  KEY idx_mqtt_settings_station_id (station_id),
  CONSTRAINT fk_mqtt_settings_station_id FOREIGN KEY (station_id) REFERENCES stations (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS webhook_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  webhook_path VARCHAR(128) NOT NULL,
  payload JSON NULL,
  result_status INT NULL,
  result_body TEXT NULL,
  is_duplicate TINYINT(1) NOT NULL DEFAULT 0,
  is_test TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_webhook_logs_created_at (created_at),
  KEY idx_webhook_logs_path (webhook_path),
  KEY idx_webhook_logs_path_date (webhook_path, created_at),
  KEY idx_webhook_logs_duplicate (is_duplicate, created_at),
  KEY idx_webhook_logs_test (is_test, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS api_tokens (
  id VARCHAR(64) NOT NULL,
  name VARCHAR(128) NOT NULL,
  token TEXT NOT NULL,
  token_hash VARCHAR(256) NOT NULL,
  permissions JSON NULL,
  usage_count INT NOT NULL DEFAULT 0,
  last_used DATETIME NULL,
  expires_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_api_tokens_token_hash (token_hash),
  KEY idx_api_tokens_hash (token_hash),
  KEY idx_api_tokens_hash_usage (token_hash, usage_count)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS outgoing_transactions (
  id VARCHAR(128) NOT NULL,
  payload JSON NULL,
  received_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  processed_at DATETIME NULL,
  status ENUM('pending','processed','failed') NOT NULL DEFAULT 'pending',
  PRIMARY KEY (id),
  KEY idx_outgoing_tx_status_processed (status, processed_at),
  KEY idx_outgoing_tx_status (status),
  KEY idx_outgoing_tx_status_received (status, received_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS daily_bay_summary (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  summary_date DATE NOT NULL,
  station_id INT NOT NULL,
  bay_code VARCHAR(255) NOT NULL,
  total_transactions INT NOT NULL DEFAULT 0,
  total_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  total_op_time INT NOT NULL DEFAULT 0,
  total_foam_time INT NOT NULL DEFAULT 0,
  last_updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_daily_bay_summary (summary_date, station_id, bay_code),
  KEY idx_daily_bay_summary_date_station (summary_date, station_id),
  KEY idx_daily_bay_summary_bay_code (bay_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS hourly_station_summary (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  summary_date DATE NOT NULL,
  hour TINYINT UNSIGNED NOT NULL,
  station_id INT UNSIGNED NOT NULL,
  total_transactions INT UNSIGNED NOT NULL DEFAULT 0,
  total_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  total_op_time INT NOT NULL DEFAULT 0,
  last_updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_date_hour_station (summary_date, hour, station_id),
  KEY idx_date_station (summary_date, station_id),
  KEY idx_station (station_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS system_users (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  username VARCHAR(64) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(128) NOT NULL,
  role ENUM('sa','engineer','agency','regional_manager','station_supervisor') NOT NULL DEFAULT 'agency',
  agency_id INT UNSIGNED NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  avatar TEXT NULL,
  last_login_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_system_users_username (username),
  KEY idx_system_users_role (role),
  KEY idx_system_users_agency_id (agency_id),
  KEY idx_system_users_agency_active (agency_id, is_active),
  KEY idx_system_users_active_role (is_active, role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_province_scope (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT UNSIGNED NOT NULL,
  province_id INT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_user_province_scope (user_id, province_id),
  CONSTRAINT fk_user_province_scope_user_id FOREIGN KEY (user_id) REFERENCES system_users (id) ON DELETE CASCADE,
  CONSTRAINT fk_user_province_scope_province_id FOREIGN KEY (province_id) REFERENCES provinces (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_station_scope (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT UNSIGNED NOT NULL,
  station_id INT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_user_station_scope (user_id, station_id),
  CONSTRAINT fk_user_station_scope_user_id FOREIGN KEY (user_id) REFERENCES system_users (id) ON DELETE CASCADE,
  CONSTRAINT fk_user_station_scope_station_id FOREIGN KEY (station_id) REFERENCES stations (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS feedback (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  agency_id INT UNSIGNED NOT NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  status ENUM('pending','replied') NOT NULL DEFAULT 'pending',
  reply TEXT NULL,
  replied_by VARCHAR(100) NULL,
  replied_at TIMESTAMP NULL,
  is_read_by_agency TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_feedback_agency_status_date (agency_id, status, created_at),
  KEY idx_feedback_agency_status (agency_id, status),
  KEY idx_feedback_status (status),
  KEY idx_feedback_date_status (created_at, status),
  KEY idx_feedback_unread (agency_id, is_read_by_agency, created_at),
  CONSTRAINT fk_feedback_agency_id FOREIGN KEY (agency_id) REFERENCES agency (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT UNSIGNED NULL,
  username VARCHAR(64) NOT NULL,
  role VARCHAR(20) NOT NULL,
  action VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50) NULL,
  entity_id INT UNSIGNED NULL,
  entity_name VARCHAR(200) NULL,
  details JSON NULL,
  ip_address VARCHAR(45) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_audit_created_at (created_at),
  KEY idx_audit_user_id (user_id),
  KEY idx_audit_action (action),
  KEY idx_audit_entity_type (entity_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
