// Large JavaScript Example - 600+ lines with critical security issues
const express = require('express');
const mysql = require('mysql2');
const crypto = require('crypto');
const fs = require('fs');
const { exec } = require('child_process');
const axios = require('axios');

const app = express();

// CRITICAL: Hardcoded credentials
const DB_PASSWORD = "super_secret_db_password_12345";
const API_SECRET_KEY = "sk_live_51H3jK9mLn8Y4vX7zQwR2tN5pA6bC9dE0fG1hI2jK3lM4nO5p";
const JWT_SECRET = "my-super-secret-jwt-key-that-should-never-be-hardcoded";
const ADMIN_PASSWORD = "admin123";

// Database connection
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: DB_PASSWORD,
  database: 'app_db'
});

// CRITICAL: SQL Injection vulnerabilities
function getUserById(userId) {
  // CRITICAL: Template literal SQL injection
  const query = `SELECT * FROM users WHERE id = ${userId}`;
  return new Promise((resolve, reject) => {
    connection.query(query, (err, results) => {
      if (err) reject(err);
      else resolve(results[0]);
    });
  });
}

function searchUsers(searchTerm) {
  // CRITICAL: SQL Injection with LIKE
  const query = `SELECT * FROM users WHERE name LIKE '%${searchTerm}%' OR email LIKE '%${searchTerm}%'`;
  return new Promise((resolve, reject) => {
    connection.query(query, (err, results) => {
      if (err) reject(err);
      else resolve(results);
    });
  });
}

function updateUser(userId, name, email) {
  // CRITICAL: SQL Injection in UPDATE
  const query = `UPDATE users SET name = '${name}', email = '${email}' WHERE id = ${userId}`;
  return new Promise((resolve, reject) => {
    connection.query(query, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

function deleteUser(userId) {
  // CRITICAL: SQL Injection in DELETE
  const query = `DELETE FROM users WHERE id = ${userId}`;
  return new Promise((resolve, reject) => {
    connection.query(query, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

function createUser(username, password, email) {
  // CRITICAL: SQL Injection + Weak password hashing
  const hashedPassword = hashPasswordMD5(password); // CRITICAL: MD5 is weak
  const query = `INSERT INTO users (username, password, email) VALUES ('${username}', '${hashedPassword}', '${email}')`;
  return new Promise((resolve, reject) => {
    connection.query(query, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

// CRITICAL: XSS vulnerabilities
app.get('/user/:userId', (req, res) => {
  getUserById(req.params.userId).then(user => {
    // CRITICAL: Direct output without sanitization
    const html = `
      <h1>User Profile</h1>
      <p>Name: ${user.name}</p>
      <p>Email: ${user.email}</p>
      <p>Bio: ${req.query.bio || ''}</p>
    `;
    res.send(html); // CRITICAL: XSS
  });
});

app.get('/comment', (req, res) => {
  // CRITICAL: XSS - User input in HTML
  const comment = req.query.comment || '';
  const html = `<div class="comment">${comment}</div>`;
  res.send(html); // CRITICAL: XSS
});

app.get('/search', (req, res) => {
  // CRITICAL: XSS in search results
  const query = req.query.q || '';
  searchUsers(query).then(results => {
    const html = `
      <h1>Search Results for: ${query}</h1>
      <ul>
        ${results.map(r => `<li>${r.name}</li>`).join('')}
      </ul>
    `;
    res.send(html); // CRITICAL: XSS
  });
});

// CRITICAL: Command Injection
function backupDatabase(dbName) {
  // CRITICAL: Command injection via exec
  const command = `mysqldump -u root -p${DB_PASSWORD} ${dbName}`;
  exec(command, (error, stdout, stderr) => {
    if (error) console.error(error);
    else console.log(stdout);
  });
}

function executeSystemCommand(userCommand) {
  // CRITICAL: User input in system command
  exec(`sh -c ${userCommand}`, (error, stdout, stderr) => {
    if (error) console.error(error);
    else console.log(stdout);
  });
}

function processFile(filename) {
  // CRITICAL: Command injection
  exec(`cat ${filename}`, (error, stdout, stderr) => {
    if (error) console.error(error);
    else console.log(stdout);
  });
}

// CRITICAL: Insecure random
function generateSessionToken() {
  // CRITICAL: Math.random() is not cryptographically secure
  return Math.random().toString(36).substring(2, 15);
}

function generatePasswordResetToken() {
  // CRITICAL: Insecure random for security-sensitive operation
  return Math.random().toString(36).substring(2, 10);
}

function generateAPIKey() {
  // CRITICAL: Insecure random
  return Array.from({ length: 32 }, () => 
    'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)]
  ).join('');
}

// CRITICAL: Weak cryptography
function hashPasswordMD5(password) {
  // CRITICAL: MD5 is cryptographically broken
  return crypto.createHash('md5').update(password).digest('hex');
}

function hashPasswordSHA1(password) {
  // CRITICAL: SHA1 is also weak
  return crypto.createHash('sha1').update(password).digest('hex');
}

// CRITICAL: eval() usage
function processDynamicCode(userCode) {
  // CRITICAL: eval() can execute arbitrary code
  return eval(userCode); // CRITICAL: Never use eval with user input
}

function calculateExpression(expression) {
  // CRITICAL: eval() usage
  return eval(expression); // CRITICAL
}

function executeTemplateCode(templateCode, context) {
  // CRITICAL: eval() in template
  return eval(templateCode); // CRITICAL
}

// CRITICAL: Insecure HTTP connections
function sendUserData(apiUrl, userData) {
  // CRITICAL: HTTP instead of HTTPS
  axios.post('http://external-api.com/send', userData) // CRITICAL: HTTP
    .then(response => console.log(response.data))
    .catch(error => console.error(error));
}

function fetchExternalData(endpoint) {
  // CRITICAL: HTTP connection
  axios.get(`http://${endpoint}/data`) // CRITICAL: HTTP
    .then(response => console.log(response.data))
    .catch(error => console.error(error));
}

function downloadFile(fileUrl) {
  // CRITICAL: HTTP download
  axios.get(`http://${fileUrl}`, { responseType: 'stream' }) // CRITICAL: HTTP
    .then(response => {
      const writer = fs.createWriteStream('/tmp/downloaded_file');
      response.data.pipe(writer);
    })
    .catch(error => console.error(error));
}

// CRITICAL: File operations
function readUserFile(filename) {
  // CRITICAL: Path traversal
  const filePath = `/app/uploads/${filename}`; // CRITICAL: No validation
  return fs.readFileSync(filePath, 'utf8');
}

function writeUserData(filename, data) {
  // CRITICAL: Path traversal
  const filePath = `/app/data/${filename}`; // CRITICAL: No validation
  fs.writeFileSync(filePath, data);
}

function deleteUserFile(filename) {
  // CRITICAL: Path traversal
  const filePath = `/app/files/${filename}`; // CRITICAL: No validation
  fs.unlinkSync(filePath);
}

// Additional complex methods to reach 500+ lines
function processBulkUsers(userIds) {
  userIds.forEach(userId => {
    getUserById(userId).then(user => {
      if (user) {
        updateUserLastLogin(userId);
        sendWelcomeEmail(user.email);
        logUserActivity(userId, 'LOGIN');
      }
    });
  });
}

function updateUserLastLogin(userId) {
  const query = `UPDATE users SET last_login = NOW() WHERE id = ${userId}`;
  connection.query(query, (err) => {
    if (err) console.error(err);
  });
}

function sendWelcomeEmail(email) {
  // CRITICAL: Email injection potential
  const subject = 'Welcome!';
  const body = `Hello, welcome to our service! Your email is ${email}`;
  console.log(`Sending email to: ${email}`);
}

function logUserActivity(userId, activity) {
  const query = `INSERT INTO user_activity (user_id, activity, timestamp) VALUES (${userId}, '${activity}', NOW())`;
  connection.query(query, (err) => {
    if (err) console.error(err);
  });
}

function getUsersByRole(role) {
  // CRITICAL: SQL Injection
  const query = `SELECT * FROM users WHERE role = '${role}'`;
  return new Promise((resolve, reject) => {
    connection.query(query, (err, results) => {
      if (err) reject(err);
      else resolve(results);
    });
  });
}

function changeUserPassword(userId, newPassword) {
  // CRITICAL: Weak hashing + SQL Injection
  const hashedPassword = hashPasswordMD5(newPassword);
  const query = `UPDATE users SET password = '${hashedPassword}' WHERE id = ${userId}`;
  connection.query(query, (err) => {
    if (err) console.error(err);
  });
}

function exportUserData(userId, format) {
  getUserById(userId).then(user => {
    if (user) {
      // CRITICAL: Command injection
      const command = `export-user-data --user ${userId} --format ${format}`;
      exec(command, (error, stdout, stderr) => {
        if (error) console.error(error);
        else console.log(stdout);
      });
    }
  });
}

function importUserData(filePath) {
  // CRITICAL: Path traversal
  const fullPath = `/app/uploads/${filePath}`;
  const data = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
  return data;
}

function generateUserReport(userId, reportType) {
  getUserById(userId).then(user => {
    if (user) {
      // CRITICAL: XSS in report generation
      const html = `
        <html><body>
        <h1>User Report: ${user.name}</h1>
        <p>Report Type: ${reportType}</p>
        <p>Generated by: ${req.query.admin || ''}</p>
        </body></html>
      `;
      return html;
    }
  });
}

function validateUserInput(userInput) {
  // CRITICAL: No actual validation, direct use
  if (userInput && userInput.length > 0) {
    return processInput(userInput);
  }
  return null;
}

function processInput(userInput) {
  // CRITICAL: Direct use of user input
  const processed = userInput.toLowerCase().trim();
  const query = `SELECT * FROM data WHERE value = '${processed}'`;
  connection.query(query, (err, results) => {
    if (err) console.error(err);
    else return results;
  });
}

function authenticateUser(username, password) {
  // CRITICAL: SQL Injection + Weak password comparison
  const hashedPassword = hashPasswordMD5(password);
  const query = `SELECT * FROM users WHERE username = '${username}' AND password = '${hashedPassword}'`;
  return new Promise((resolve, reject) => {
    connection.query(query, (err, results) => {
      if (err) reject(err);
      else resolve(results.length > 0);
    });
  });
}

function resetPassword(email) {
  // CRITICAL: SQL Injection + Information disclosure
  const query = `SELECT * FROM users WHERE email = '${email}'`;
  connection.query(query, (err, results) => {
    if (err) {
      console.error(err);
      return;
    }
    if (results.length > 0) {
      const token = generatePasswordResetToken(); // CRITICAL: Insecure random
      console.log(`Password reset token for ${email}: ${token}`);
    }
  });
}

function updateUserProfile(userId, profileData) {
  // CRITICAL: SQL Injection
  const name = profileData.name || '';
  const bio = profileData.bio || '';
  const query = `UPDATE users SET name = '${name}', bio = '${bio}' WHERE id = ${userId}`;
  connection.query(query, (err) => {
    if (err) console.error(err);
  });
}

function getUserPermissions(userId) {
  // CRITICAL: SQL Injection
  const query = `SELECT permissions FROM users WHERE id = ${userId}`;
  return new Promise((resolve, reject) => {
    connection.query(query, (err, results) => {
      if (err) reject(err);
      else {
        if (results.length > 0) {
          // CRITICAL: eval() on database data
          const permissions = eval(results[0].permissions); // CRITICAL
          resolve(permissions);
        } else {
          resolve([]);
        }
      }
    });
  });
}

function saveUserPreferences(userId, preferences) {
  // CRITICAL: JSON serialization without validation
  const serialized = JSON.stringify(preferences);
  const query = `UPDATE users SET preferences = '${serialized}' WHERE id = ${userId}`;
  connection.query(query, (err) => {
    if (err) console.error(err);
  });
}

function loadUserPreferences(userId) {
  // CRITICAL: JSON deserialization without validation
  const query = `SELECT preferences FROM users WHERE id = ${userId}`;
  return new Promise((resolve, reject) => {
    connection.query(query, (err, results) => {
      if (err) reject(err);
      else {
        if (results.length > 0) {
          const preferences = JSON.parse(results[0].preferences);
          resolve(preferences);
        } else {
          resolve({});
        }
      }
    });
  });
}

// Express routes
app.get('/', (req, res) => {
  res.send('Welcome to User Management System');
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  authenticateUser(username, password).then(authenticated => {
    if (authenticated) {
      res.redirect('/dashboard');
    } else {
      res.send('Invalid credentials');
    }
  });
});

app.get('/dashboard', (req, res) => {
  const userId = req.query.user_id;
  res.redirect(`/user/${userId}`);
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
