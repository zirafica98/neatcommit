<?php
// PHP Example - Security Issues

// CRITICAL: Hardcoded password
$password = "admin123";
$api_key = "sk-1234567890abcdef";

// CRITICAL: SQL Injection - mysql_query()
$user_id = $_GET['id'];
$query = "SELECT * FROM users WHERE id = " . $user_id;
$result = mysql_query($query);

// CRITICAL: SQL Injection - mysqli_query()
$name = $_POST['name'];
$query2 = "SELECT * FROM users WHERE name = '" . $name . "'";
mysqli_query($connection, $query2);

// HIGH: XSS - Direct output
echo $_GET['name'];
print $_POST['comment'];

// CRITICAL: File Inclusion
include($_GET['page']);
require($_POST['template']);

// CRITICAL: eval()
eval($_GET['code']);

// HIGH: Command Injection
system("ls -la " . $_GET['dir']);
exec("rm -rf " . $user_input);

?>
