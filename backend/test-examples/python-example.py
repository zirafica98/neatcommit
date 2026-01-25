# Python Example - Security Issues
import os
import pickle
import random
import subprocess

# CRITICAL: Hardcoded password
password = "secret123"
api_key = "sk-1234567890abcdef"

def get_user(user_id):
    # CRITICAL: SQL Injection - String formatting
    query = "SELECT * FROM users WHERE id = %s" % user_id
    cursor.execute(query)
    
    # CRITICAL: SQL Injection - format()
    query2 = "SELECT * FROM users WHERE name = '{}'".format(request.get('name'))
    cursor.execute(query2)

def delete_file(filename):
    # CRITICAL: Command Injection - os.system()
    os.system("rm -rf " + filename)
    
    # HIGH: Command Injection - subprocess with shell
    subprocess.call(["rm", "-rf", filename], shell=True)

def load_data(data):
    # CRITICAL: Unsafe deserialization - Pickle
    obj = pickle.loads(data)

def generate_token():
    # MEDIUM: Insecure random
    token = random.randint(1000, 9999)
    return str(token)

def execute_code(code):
    # CRITICAL: eval() usage
    result = eval(code)
