-- SQL Example - Security Issues

-- CRITICAL: Missing WHERE clause in UPDATE
UPDATE users SET password = 'newpass123';

-- CRITICAL: Missing WHERE clause in DELETE
DELETE FROM logs;

-- CRITICAL: SQL Injection - String concatenation
SELECT * FROM users WHERE id = ' + userId;

-- CRITICAL: SQL Injection - EXEC()
EXEC('SELECT * FROM users WHERE id = ' + @userId);

-- HIGH: Excessive privileges
GRANT ALL PRIVILEGES ON *.* TO 'user'@'%';

-- CRITICAL: SQL Injection in WHERE clause
SELECT * FROM users WHERE name = '" + userName + "';

-- CRITICAL: SQL Injection in stored procedure
EXEC sp_GetUser @id = ' + userId;
