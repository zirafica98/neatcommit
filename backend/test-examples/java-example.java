// Java Example - Security Issues
package com.example.service;

import java.sql.*;
import java.util.Random;

public class UserService {
    private String password = "admin123"; // CRITICAL: Hardcoded password
    
    public User getUserById(String userId) {
        // CRITICAL: SQL Injection - String concatenation
        String query = "SELECT * FROM users WHERE id = " + userId;
        Statement stmt = connection.createStatement();
        ResultSet rs = stmt.executeQuery(query);
        
        return mapToUser(rs);
    }
    
    public void updateUser(String userId, String name) {
        // CRITICAL: SQL Injection - execute() with concatenation
        String sql = "UPDATE users SET name = '" + name + "' WHERE id = " + userId;
        Statement stmt = connection.createStatement();
        stmt.execute(sql);
    }
    
    public void printUser(String userId) {
        // HIGH: XSS - Direct output without encoding
        response.getWriter().print("User: " + request.getParameter("name"));
    }
    
    public String generateToken() {
        // MEDIUM: Insecure random
        Random random = new Random();
        return String.valueOf(random.nextInt());
    }
    
    public void deserializeData(byte[] data) {
        // CRITICAL: Unsafe deserialization
        ObjectInputStream ois = new ObjectInputStream(new ByteArrayInputStream(data));
        Object obj = ois.readObject();
    }
}
