-- Reset password in md5 format for local dev Npgsql compatibility
SET password_encryption = 'md5';
ALTER USER iot_user WITH PASSWORD 'iot_password';
