# Ruby Example - Security Issues

# CRITICAL: Hardcoded password
password = "secret123"
api_key = "sk-1234567890abcdef"

# CRITICAL: SQL Injection - String interpolation
user_id = params[:id]
User.where("id = #{user_id}")

# CRITICAL: SQL Injection - execute()
query = "SELECT * FROM users WHERE name = '#{params[:name]}'"
connection.execute(query)

# HIGH: XSS - ERB template without escaping
<%= @user.name %>

# CRITICAL: Command Injection - system()
system("rm -rf #{user_input}")

# CRITICAL: Command Injection - Backticks
result = `ls -la #{directory}`

# CRITICAL: eval()
eval(params[:code])

# HIGH: Command Injection - exec()
exec("cat #{filename}")
