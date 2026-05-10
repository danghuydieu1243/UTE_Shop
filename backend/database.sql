-- UTEShop Database Schema
-- Run this in phpMyAdmin or MySQL command line

CREATE DATABASE IF NOT EXISTS uteshop CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE uteshop;

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  phone VARCHAR(20),
  role ENUM('user', 'admin') DEFAULT 'user',
  is_verified BOOLEAN DEFAULT FALSE,
  verification_token VARCHAR(255),
  token_expires DATETIME,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_verification_token (verification_token),
  INDEX idx_role_verified (role, is_verified)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Password reset tokens table
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_token (token),
  INDEX idx_user_id (user_id),
  INDEX idx_expires (expires_at),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert sample admin user (password: Admin@123)
-- Note: This is a bcrypt hash, you should generate your own
-- To generate: node -e "console.log(require('bcrypt').hashSync('Admin@123', 10))"
INSERT IGNORE INTO users (email, password, full_name, role, is_verified) VALUES (
  'admin@uteshop.com',
  '$2a$10$YourBcryptHashHere', -- Replace with actual bcrypt hash
  'Admin User',
  'admin',
  TRUE
) ON DUPLICATE KEY UPDATE email=email;

-- Insert sample regular user (password: User@123)
INSERT IGNORE INTO users (email, password, full_name, phone, role, is_verified) VALUES (
  'user@uteshop.com',
  '$2a$10$YourBcryptHashHere', -- Replace with actual bcrypt hash
  'Test User',
  '0901234567',
  'user',
  TRUE
) ON DUPLICATE KEY UPDATE email=email;
