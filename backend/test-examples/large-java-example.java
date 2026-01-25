// Large Java Example - 600+ lines with critical security issues
package com.example.service;

import java.sql.*;
import java.io.*;
import java.util.*;
import java.security.MessageDigest;
import javax.servlet.http.*;
import javax.servlet.*;
import java.net.*;

public class UserManagementService {
    // CRITICAL: Hardcoded credentials
    private static final String DB_PASSWORD = "super_secret_password_12345";
    private static final String API_KEY = "sk_live_51H3jK9mLn8Y4vX7zQwR2tN5pA6bC9dE0fG1hI2jK3lM4nO5p";
    private static final String JWT_SECRET = "my-super-secret-jwt-key-that-should-never-be-hardcoded";
    
    private Connection connection;
    private HttpServletRequest request;
    private HttpServletResponse response;
    
    public UserManagementService() {
        // Initialize connection
    }
    
    // CRITICAL: SQL Injection - Multiple instances
    public User getUserById(String userId) {
        try {
            // CRITICAL: Direct string concatenation
            String query = "SELECT * FROM users WHERE id = " + userId;
            Statement stmt = connection.createStatement();
            ResultSet rs = stmt.executeQuery(query);
            
            if (rs.next()) {
                return mapToUser(rs);
            }
        } catch (SQLException e) {
            e.printStackTrace();
        }
        return null;
    }
    
    public List<User> searchUsers(String searchTerm) {
        List<User> users = new ArrayList<>();
        try {
            // CRITICAL: SQL Injection with LIKE
            String query = "SELECT * FROM users WHERE name LIKE '%" + searchTerm + "%' OR email LIKE '%" + searchTerm + "%'";
            Statement stmt = connection.createStatement();
            ResultSet rs = stmt.executeQuery(query);
            
            while (rs.next()) {
                users.add(mapToUser(rs));
            }
        } catch (SQLException e) {
            e.printStackTrace();
        }
        return users;
    }
    
    public void updateUser(String userId, String name, String email) {
        try {
            // CRITICAL: SQL Injection in UPDATE
            String sql = "UPDATE users SET name = '" + name + "', email = '" + email + "' WHERE id = " + userId;
            Statement stmt = connection.createStatement();
            stmt.executeUpdate(sql);
        } catch (SQLException e) {
            e.printStackTrace();
        }
    }
    
    public void deleteUser(String userId) {
        try {
            // CRITICAL: SQL Injection in DELETE
            String sql = "DELETE FROM users WHERE id = " + userId;
            Statement stmt = connection.createStatement();
            stmt.execute(sql);
        } catch (SQLException e) {
            e.printStackTrace();
        }
    }
    
    public void createUser(String username, String password, String email) {
        try {
            // CRITICAL: SQL Injection + Weak password hashing
            String hashedPassword = hashPasswordMD5(password); // CRITICAL: MD5 is weak
            String sql = "INSERT INTO users (username, password, email) VALUES ('" + 
                       username + "', '" + hashedPassword + "', '" + email + "')";
            Statement stmt = connection.createStatement();
            stmt.executeUpdate(sql);
        } catch (SQLException e) {
            e.printStackTrace();
        }
    }
    
    // CRITICAL: XSS vulnerabilities
    public void displayUserProfile(String userId) {
        try {
            User user = getUserById(userId);
            if (user != null) {
                // CRITICAL: Direct output without encoding
                response.getWriter().print("<h1>User Profile</h1>");
                response.getWriter().print("<p>Name: " + user.getName() + "</p>");
                response.getWriter().print("<p>Email: " + user.getEmail() + "</p>");
                response.getWriter().print("<p>Bio: " + request.getParameter("bio") + "</p>");
            }
        } catch (IOException e) {
            e.printStackTrace();
        }
    }
    
    public void displayUserComments(String userId) {
        try {
            // CRITICAL: XSS - User input directly in HTML
            String comment = request.getParameter("comment");
            response.getWriter().print("<div class='comment'>" + comment + "</div>");
        } catch (IOException e) {
            e.printStackTrace();
        }
    }
    
    // CRITICAL: Unsafe deserialization
    public void processUserData(byte[] serializedData) {
        try {
            // CRITICAL: Deserialization without validation
            ObjectInputStream ois = new ObjectInputStream(new ByteArrayInputStream(serializedData));
            Object userData = ois.readObject();
            processData(userData);
        } catch (IOException | ClassNotFoundException e) {
            e.printStackTrace();
        }
    }
    
    public void loadConfiguration(String configPath) {
        try {
            // CRITICAL: File path injection
            String fullPath = "/app/config/" + configPath;
            FileInputStream fis = new FileInputStream(fullPath);
            Properties props = new Properties();
            props.load(fis);
        } catch (IOException e) {
            e.printStackTrace();
        }
    }
    
    // CRITICAL: Command injection
    public void backupDatabase(String dbName) {
        try {
            // CRITICAL: Command injection via Runtime.exec
            String command = "mysqldump -u root -p" + DB_PASSWORD + " " + dbName;
            Runtime.getRuntime().exec(command);
        } catch (IOException e) {
            e.printStackTrace();
        }
    }
    
    public void executeSystemCommand(String userCommand) {
        try {
            // CRITICAL: User input in system command
            Runtime.getRuntime().exec("sh -c " + userCommand);
        } catch (IOException e) {
            e.printStackTrace();
        }
    }
    
    // CRITICAL: Insecure random
    public String generateSessionToken() {
        // CRITICAL: java.util.Random is not cryptographically secure
        Random random = new Random();
        return String.valueOf(random.nextLong());
    }
    
    public String generatePasswordResetToken() {
        // CRITICAL: Insecure random for security-sensitive operation
        Random random = new Random();
        return String.valueOf(random.nextInt(1000000));
    }
    
    // CRITICAL: Weak cryptography
    private String hashPasswordMD5(String password) {
        try {
            // CRITICAL: MD5 is cryptographically broken
            MessageDigest md = MessageDigest.getInstance("MD5");
            byte[] hash = md.digest(password.getBytes());
            return bytesToHex(hash);
        } catch (Exception e) {
            return password; // CRITICAL: Fallback to plaintext
        }
    }
    
    private String hashPasswordSHA1(String password) {
        try {
            // CRITICAL: SHA1 is also weak
            MessageDigest md = MessageDigest.getInstance("SHA1");
            byte[] hash = md.digest(password.getBytes());
            return bytesToHex(hash);
        } catch (Exception e) {
            return password;
        }
    }
    
    // CRITICAL: Insecure HTTP connections
    public void sendUserData(String apiUrl, String userData) {
        try {
            // CRITICAL: HTTP instead of HTTPS
            URL url = new URL("http://external-api.com/send");
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("POST");
            conn.setDoOutput(true);
            conn.getOutputStream().write(userData.getBytes());
        } catch (IOException e) {
            e.printStackTrace();
        }
    }
    
    public void fetchExternalData(String endpoint) {
        try {
            // CRITICAL: HTTP connection
            URL url = new URL("http://" + endpoint);
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            BufferedReader reader = new BufferedReader(new InputStreamReader(conn.getInputStream()));
            String line;
            while ((line = reader.readLine()) != null) {
                response.getWriter().print(line); // CRITICAL: XSS potential
            }
        } catch (IOException e) {
            e.printStackTrace();
        }
    }
    
    // CRITICAL: Information disclosure
    public void handleError(Exception e) {
        try {
            // CRITICAL: Stack trace exposed to user
            response.getWriter().print("Error: " + e.getMessage());
            e.printStackTrace(response.getWriter()); // CRITICAL: Full stack trace
        } catch (IOException ioException) {
            ioException.printStackTrace();
        }
    }
    
    public void logError(Exception e) {
        // CRITICAL: Sensitive information in logs
        System.out.println("Error occurred for user: " + request.getParameter("username"));
        System.out.println("Password attempt: " + request.getParameter("password"));
        System.out.println("Full error: " + e.toString());
        e.printStackTrace();
    }
    
    // Additional complex methods to reach 500+ lines
    public void processBulkUsers(List<String> userIds) {
        for (String userId : userIds) {
            User user = getUserById(userId);
            if (user != null) {
                updateUserLastLogin(userId);
                sendWelcomeEmail(user.getEmail());
                logUserActivity(userId, "LOGIN");
            }
        }
    }
    
    public void updateUserLastLogin(String userId) {
        try {
            String sql = "UPDATE users SET last_login = NOW() WHERE id = " + userId;
            Statement stmt = connection.createStatement();
            stmt.executeUpdate(sql);
        } catch (SQLException e) {
            e.printStackTrace();
        }
    }
    
    public void sendWelcomeEmail(String email) {
        try {
            // CRITICAL: Email injection potential
            String subject = "Welcome!";
            String body = "Hello, welcome to our service!";
            // Simulated email sending
            System.out.println("Sending email to: " + email);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
    
    public void logUserActivity(String userId, String activity) {
        try {
            String sql = "INSERT INTO user_activity (user_id, activity, timestamp) VALUES (" + 
                        userId + ", '" + activity + "', NOW())";
            Statement stmt = connection.createStatement();
            stmt.executeUpdate(sql);
        } catch (SQLException e) {
            e.printStackTrace();
        }
    }
    
    public List<User> getUsersByRole(String role) {
        List<User> users = new ArrayList<>();
        try {
            // CRITICAL: SQL Injection
            String query = "SELECT * FROM users WHERE role = '" + role + "'";
            Statement stmt = connection.createStatement();
            ResultSet rs = stmt.executeQuery(query);
            
            while (rs.next()) {
                users.add(mapToUser(rs));
            }
        } catch (SQLException e) {
            e.printStackTrace();
        }
        return users;
    }
    
    public void changeUserPassword(String userId, String newPassword) {
        try {
            // CRITICAL: Weak hashing + SQL Injection
            String hashedPassword = hashPasswordMD5(newPassword);
            String sql = "UPDATE users SET password = '" + hashedPassword + "' WHERE id = " + userId;
            Statement stmt = connection.createStatement();
            stmt.executeUpdate(sql);
        } catch (SQLException e) {
            e.printStackTrace();
        }
    }
    
    public void exportUserData(String userId, String format) {
        try {
            User user = getUserById(userId);
            if (user != null) {
                // CRITICAL: Command injection
                String command = "export-user-data --user " + userId + " --format " + format;
                Runtime.getRuntime().exec(command);
            }
        } catch (IOException e) {
            e.printStackTrace();
        }
    }
    
    public void importUserData(String filePath) {
        try {
            // CRITICAL: Path traversal
            File file = new File("/app/uploads/" + filePath);
            FileInputStream fis = new FileInputStream(file);
            // Process file
        } catch (IOException e) {
            e.printStackTrace();
        }
    }
    
    public void generateUserReport(String userId, String reportType) {
        try {
            User user = getUserById(userId);
            if (user != null) {
                // CRITICAL: XSS in report generation
                response.getWriter().print("<html><body>");
                response.getWriter().print("<h1>User Report: " + user.getName() + "</h1>");
                response.getWriter().print("<p>Report Type: " + reportType + "</p>");
                response.getWriter().print("<p>Generated by: " + request.getParameter("admin") + "</p>");
                response.getWriter().print("</body></html>");
            }
        } catch (IOException e) {
            e.printStackTrace();
        }
    }
    
    public void validateUserInput(String input) {
        // CRITICAL: No validation, direct use
        if (input != null && !input.isEmpty()) {
            processInput(input);
        }
    }
    
    public void processInput(String input) {
        try {
            // CRITICAL: Direct use of user input
            String processed = input.toLowerCase().trim();
            String query = "SELECT * FROM data WHERE value = '" + processed + "'";
            Statement stmt = connection.createStatement();
            stmt.executeQuery(query);
        } catch (SQLException e) {
            e.printStackTrace();
        }
    }
    
    // Helper methods
    private User mapToUser(ResultSet rs) throws SQLException {
        User user = new User();
        user.setId(rs.getInt("id"));
        user.setName(rs.getString("name"));
        user.setEmail(rs.getString("email"));
        return user;
    }
    
    private String bytesToHex(byte[] bytes) {
        StringBuilder sb = new StringBuilder();
        for (byte b : bytes) {
            sb.append(String.format("%02x", b));
        }
        return sb.toString();
    }
    
    private void processData(Object data) {
        // Process deserialized data
    }
    
    // User class
    private static class User {
        private int id;
        private String name;
        private String email;
        
        public int getId() { return id; }
        public void setId(int id) { this.id = id; }
        public String getName() { return name; }
        public void setName(String name) { this.name = name; }
        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }
    }
}
