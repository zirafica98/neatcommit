# Large Python Example - 600+ lines with critical security issues
import os
import sys
import pickle
import subprocess
import random
import hashlib
import urllib.request
import json
from flask import Flask, request, render_template_string, redirect, url_for
from sqlalchemy import create_engine, text

app = Flask(__name__)

# CRITICAL: Hardcoded credentials
DATABASE_PASSWORD = "super_secret_db_password_12345"
API_SECRET_KEY = "sk_live_51H3jK9mLn8Y4vX7zQwR2tN5pA6bC9dE0fG1hI2jK3lM4nO5p"
JWT_SECRET = "my-super-secret-jwt-key-that-should-never-be-hardcoded"
ADMIN_PASSWORD = "admin123"

# CRITICAL: SQL Injection vulnerabilities
def get_user_by_id(user_id):
    """CRITICAL: SQL Injection - String formatting"""
    engine = create_engine(f"postgresql://user:{DATABASE_PASSWORD}@localhost/db")
    query = f"SELECT * FROM users WHERE id = {user_id}"
    result = engine.execute(text(query))
    return result.fetchone()

def search_users(search_term):
    """CRITICAL: SQL Injection with LIKE"""
    engine = create_engine(f"postgresql://user:{DATABASE_PASSWORD}@localhost/db")
    query = f"SELECT * FROM users WHERE name LIKE '%{search_term}%' OR email LIKE '%{search_term}%'"
    result = engine.execute(text(query))
    return result.fetchall()

def update_user(user_id, name, email):
    """CRITICAL: SQL Injection in UPDATE"""
    engine = create_engine(f"postgresql://user:{DATABASE_PASSWORD}@localhost/db")
    query = f"UPDATE users SET name = '{name}', email = '{email}' WHERE id = {user_id}"
    engine.execute(text(query))

def delete_user(user_id):
    """CRITICAL: SQL Injection in DELETE"""
    engine = create_engine(f"postgresql://user:{DATABASE_PASSWORD}@localhost/db")
    query = f"DELETE FROM users WHERE id = {user_id}"
    engine.execute(text(query))

def create_user(username, password, email):
    """CRITICAL: SQL Injection + Weak password hashing"""
    hashed_password = hash_password_md5(password)  # CRITICAL: MD5 is weak
    engine = create_engine(f"postgresql://user:{DATABASE_PASSWORD}@localhost/db")
    query = f"INSERT INTO users (username, password, email) VALUES ('{username}', '{hashed_password}', '{email}')"
    engine.execute(text(query))

# CRITICAL: Command Injection vulnerabilities
def backup_database(db_name):
    """CRITICAL: Command injection via os.system"""
    command = f"mysqldump -u root -p{DATABASE_PASSWORD} {db_name}"
    os.system(command)  # CRITICAL: os.system with user input

def execute_system_command(user_command):
    """CRITICAL: User input in system command"""
    os.system(f"sh -c {user_command}")  # CRITICAL: Command injection

def process_file(filename):
    """CRITICAL: Command injection via subprocess"""
    command = f"cat {filename}"
    subprocess.call(command, shell=True)  # CRITICAL: shell=True with user input

def run_backup(backup_path):
    """CRITICAL: Command injection"""
    command = ["tar", "-czf", backup_path, "/app/data"]
    subprocess.run(command + request.args.getlist('extra_args'), shell=True)  # CRITICAL

# CRITICAL: Unsafe deserialization
def load_user_data(serialized_data):
    """CRITICAL: Pickle deserialization"""
    user_data = pickle.loads(serialized_data)  # CRITICAL: Can execute arbitrary code
    return user_data

def load_config(config_data):
    """CRITICAL: Pickle deserialization"""
    config = pickle.loads(config_data)
    return config

# CRITICAL: XSS vulnerabilities
@app.route('/user/<user_id>')
def display_user(user_id):
    """CRITICAL: XSS - Direct template rendering"""
    user = get_user_by_id(user_id)
    template = f"""
    <h1>User Profile</h1>
    <p>Name: {user['name']}</p>
    <p>Email: {user['email']}</p>
    <p>Bio: {request.args.get('bio', '')}</p>
    """
    return render_template_string(template)  # CRITICAL: XSS

@app.route('/comment')
def display_comment():
    """CRITICAL: XSS - User input in HTML"""
    comment = request.args.get('comment', '')
    template = f"<div class='comment'>{comment}</div>"
    return render_template_string(template)  # CRITICAL: XSS

@app.route('/search')
def search_results():
    """CRITICAL: XSS in search results"""
    query = request.args.get('q', '')
    results = search_users(query)
    template = f"""
    <h1>Search Results for: {query}</h1>
    <ul>
    {"".join([f"<li>{r['name']}</li>" for r in results])}
    </ul>
    """
    return render_template_string(template)  # CRITICAL: XSS

# CRITICAL: Insecure random
def generate_session_token():
    """CRITICAL: random module is not cryptographically secure"""
    token = random.randint(1000000, 9999999)
    return str(token)

def generate_password_reset_token():
    """CRITICAL: Insecure random for security-sensitive operation"""
    token = random.choice(['a', 'b', 'c', 'd']) + str(random.randint(1000, 9999))
    return token

def generate_api_key():
    """CRITICAL: Insecure random"""
    return ''.join([random.choice('abcdefghijklmnopqrstuvwxyz') for _ in range(32)])

# CRITICAL: Weak cryptography
def hash_password_md5(password):
    """CRITICAL: MD5 is cryptographically broken"""
    return hashlib.md5(password.encode()).hexdigest()

def hash_password_sha1(password):
    """CRITICAL: SHA1 is also weak"""
    return hashlib.sha1(password.encode()).hexdigest()

def encrypt_data(data):
    """CRITICAL: Weak encryption"""
    # Simple XOR "encryption" - not secure
    key = b"secretkey"
    encrypted = bytes([data[i] ^ key[i % len(key)] for i in range(len(data))])
    return encrypted

# CRITICAL: Insecure HTTP connections
def send_user_data(api_url, user_data):
    """CRITICAL: HTTP instead of HTTPS"""
    url = f"http://external-api.com/send"  # CRITICAL: HTTP
    req = urllib.request.Request(url, data=user_data.encode())
    urllib.request.urlopen(req)

def fetch_external_data(endpoint):
    """CRITICAL: HTTP connection"""
    url = f"http://{endpoint}/data"  # CRITICAL: HTTP
    response = urllib.request.urlopen(url)
    return response.read()

def download_file(file_url):
    """CRITICAL: HTTP download"""
    url = f"http://{file_url}"  # CRITICAL: HTTP
    urllib.request.urlretrieve(url, "/tmp/downloaded_file")

# CRITICAL: eval() usage
def process_dynamic_code(user_code):
    """CRITICAL: eval() can execute arbitrary code"""
    result = eval(user_code)  # CRITICAL: Never use eval with user input
    return result

def calculate_expression(expression):
    """CRITICAL: eval() usage"""
    return eval(expression)  # CRITICAL

def execute_template_code(template_code):
    """CRITICAL: eval() in template"""
    context = {'user': request.args.get('user')}
    result = eval(template_code, context)  # CRITICAL
    return result

# CRITICAL: File operations
def read_user_file(filename):
    """CRITICAL: Path traversal"""
    file_path = f"/app/uploads/{filename}"  # CRITICAL: No validation
    with open(file_path, 'r') as f:
        return f.read()

def write_user_data(filename, data):
    """CRITICAL: Path traversal"""
    file_path = f"/app/data/{filename}"  # CRITICAL: No validation
    with open(file_path, 'w') as f:
        f.write(data)

def delete_user_file(filename):
    """CRITICAL: Path traversal"""
    file_path = f"/app/files/{filename}"  # CRITICAL: No validation
    os.remove(file_path)

# Additional complex methods to reach 500+ lines
def process_bulk_users(user_ids):
    """Process multiple users"""
    for user_id in user_ids:
        user = get_user_by_id(user_id)
        if user:
            update_user_last_login(user_id)
            send_welcome_email(user['email'])
            log_user_activity(user_id, "LOGIN")

def update_user_last_login(user_id):
    """Update last login timestamp"""
    engine = create_engine(f"postgresql://user:{DATABASE_PASSWORD}@localhost/db")
    query = f"UPDATE users SET last_login = NOW() WHERE id = {user_id}"
    engine.execute(text(query))

def send_welcome_email(email):
    """Send welcome email"""
    # CRITICAL: Email injection potential
    subject = "Welcome!"
    body = f"Hello, welcome to our service! Your email is {email}"
    print(f"Sending email to: {email}")

def log_user_activity(user_id, activity):
    """Log user activity"""
    engine = create_engine(f"postgresql://user:{DATABASE_PASSWORD}@localhost/db")
    query = f"INSERT INTO user_activity (user_id, activity, timestamp) VALUES ({user_id}, '{activity}', NOW())"
    engine.execute(text(query))

def get_users_by_role(role):
    """Get users by role"""
    engine = create_engine(f"postgresql://user:{DATABASE_PASSWORD}@localhost/db")
    query = f"SELECT * FROM users WHERE role = '{role}'"
    result = engine.execute(text(query))
    return result.fetchall()

def change_user_password(user_id, new_password):
    """Change user password"""
    hashed_password = hash_password_md5(new_password)  # CRITICAL: Weak hashing
    engine = create_engine(f"postgresql://user:{DATABASE_PASSWORD}@localhost/db")
    query = f"UPDATE users SET password = '{hashed_password}' WHERE id = {user_id}"
    engine.execute(text(query))

def export_user_data(user_id, format_type):
    """Export user data"""
    user = get_user_by_id(user_id)
    if user:
        # CRITICAL: Command injection
        command = f"export-user-data --user {user_id} --format {format_type}"
        os.system(command)

def import_user_data(file_path):
    """Import user data"""
    # CRITICAL: Path traversal
    full_path = f"/app/uploads/{file_path}"
    with open(full_path, 'r') as f:
        data = json.load(f)
    return data

def generate_user_report(user_id, report_type):
    """Generate user report"""
    user = get_user_by_id(user_id)
    if user:
        # CRITICAL: XSS in report generation
        template = f"""
        <html><body>
        <h1>User Report: {user['name']}</h1>
        <p>Report Type: {report_type}</p>
        <p>Generated by: {request.args.get('admin', '')}</p>
        </body></html>
        """
        return render_template_string(template)

def validate_user_input(user_input):
    """Validate user input"""
    # CRITICAL: No actual validation, direct use
    if user_input and len(user_input) > 0:
        return process_input(user_input)
    return None

def process_input(user_input):
    """Process user input"""
    # CRITICAL: Direct use of user input
    processed = user_input.lower().strip()
    engine = create_engine(f"postgresql://user:{DATABASE_PASSWORD}@localhost/db")
    query = f"SELECT * FROM data WHERE value = '{processed}'"
    result = engine.execute(text(query))
    return result.fetchall()

def authenticate_user(username, password):
    """Authenticate user"""
    # CRITICAL: SQL Injection + Weak password comparison
    engine = create_engine(f"postgresql://user:{DATABASE_PASSWORD}@localhost/db")
    query = f"SELECT * FROM users WHERE username = '{username}' AND password = '{hash_password_md5(password)}'"
    result = engine.execute(text(query))
    user = result.fetchone()
    return user is not None

def reset_password(email):
    """Reset password"""
    # CRITICAL: SQL Injection + Information disclosure
    engine = create_engine(f"postgresql://user:{DATABASE_PASSWORD}@localhost/db")
    query = f"SELECT * FROM users WHERE email = '{email}'"
    result = engine.execute(text(query))
    user = result.fetchone()
    if user:
        token = generate_password_reset_token()  # CRITICAL: Insecure random
        # Send email with token
        print(f"Password reset token for {email}: {token}")

def update_user_profile(user_id, profile_data):
    """Update user profile"""
    # CRITICAL: SQL Injection
    name = profile_data.get('name', '')
    bio = profile_data.get('bio', '')
    engine = create_engine(f"postgresql://user:{DATABASE_PASSWORD}@localhost/db")
    query = f"UPDATE users SET name = '{name}', bio = '{bio}' WHERE id = {user_id}"
    engine.execute(text(query))

def get_user_permissions(user_id):
    """Get user permissions"""
    # CRITICAL: SQL Injection
    engine = create_engine(f"postgresql://user:{DATABASE_PASSWORD}@localhost/db")
    query = f"SELECT permissions FROM users WHERE id = {user_id}"
    result = engine.execute(text(query))
    user = result.fetchone()
    if user:
        # CRITICAL: eval() on database data
        permissions = eval(user['permissions'])  # CRITICAL
        return permissions
    return []

def save_user_preferences(user_id, preferences):
    """Save user preferences"""
    # CRITICAL: Pickle serialization
    serialized = pickle.dumps(preferences)
    engine = create_engine(f"postgresql://user:{DATABASE_PASSWORD}@localhost/db")
    query = f"UPDATE users SET preferences = '{serialized.hex()}' WHERE id = {user_id}"
    engine.execute(text(query))

def load_user_preferences(user_id):
    """Load user preferences"""
    # CRITICAL: Pickle deserialization
    engine = create_engine(f"postgresql://user:{DATABASE_PASSWORD}@localhost/db")
    query = f"SELECT preferences FROM users WHERE id = {user_id}"
    result = engine.execute(text(query))
    user = result.fetchone()
    if user:
        preferences_data = bytes.fromhex(user['preferences'])
        return pickle.loads(preferences_data)  # CRITICAL
    return {}

# Flask routes
@app.route('/')
def index():
    return "Welcome to User Management System"

@app.route('/login', methods=['POST'])
def login():
    username = request.form.get('username')
    password = request.form.get('password')
    if authenticate_user(username, password):
        return redirect(url_for('dashboard'))
    return "Invalid credentials"

@app.route('/dashboard')
def dashboard():
    user_id = request.args.get('user_id')
    return display_user(user_id)

if __name__ == '__main__':
    app.run(debug=True)  # CRITICAL: Debug mode in production
