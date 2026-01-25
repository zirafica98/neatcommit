// C# Example - Security Issues
using System;
using System.Data.SqlClient;
using System.Web;
using System.Runtime.Serialization.Formatters.Binary;

public class UserController
{
    // CRITICAL: Hardcoded password
    private string password = "admin123";
    private string apiKey = "sk-1234567890abcdef";
    
    public User GetUser(string userId)
    {
        // CRITICAL: SQL Injection - String concatenation
        string query = "SELECT * FROM users WHERE id = " + userId;
        SqlCommand cmd = new SqlCommand(query, connection);
        
        // CRITICAL: SQL Injection - String.Format()
        string query2 = String.Format("SELECT * FROM users WHERE name = '{0}'", Request.QueryString["name"]);
        SqlCommand cmd2 = new SqlCommand(query2, connection);
        
        return ExecuteQuery(cmd);
    }
    
    public void UpdateUser(string userId, string name)
    {
        // CRITICAL: SQL Injection
        string sql = "UPDATE users SET name = '" + name + "' WHERE id = " + userId;
        SqlCommand cmd = new SqlCommand(sql, connection);
        cmd.ExecuteNonQuery();
    }
    
    public void DisplayUser()
    {
        // HIGH: XSS - Response.Write()
        Response.Write("User: " + Request.QueryString["name"]);
    }
    
    public void DeserializeData(byte[] data)
    {
        // CRITICAL: Unsafe deserialization - BinaryFormatter
        BinaryFormatter formatter = new BinaryFormatter();
        object obj = formatter.Deserialize(new MemoryStream(data));
    }
    
    public string GenerateToken()
    {
        // MEDIUM: Insecure random
        Random random = new Random();
        return random.Next().ToString();
    }
}
