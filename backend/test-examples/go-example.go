// Go Example - Security Issues
package main

import (
    "database/sql"
    "fmt"
    "os/exec"
    "unsafe"
)

// CRITICAL: Hardcoded password
var password = "secret123"
var apiKey = "sk-1234567890abcdef"

func getUser(userID string) {
    // CRITICAL: SQL Injection - String concatenation
    query := "SELECT * FROM users WHERE id = " + userID
    db.Query(query)
    
    // CRITICAL: SQL Injection - fmt.Sprintf()
    name := request.FormValue("name")
    query2 := fmt.Sprintf("SELECT * FROM users WHERE name = '%s'", name)
    db.Query(query2)
}

func deleteFile(filename string) {
    // HIGH: Command Injection - exec.Command with concatenation
    cmd := exec.Command("rm", "-rf", filename)
    cmd.Run()
}

func unsafeOperation() {
    // MEDIUM: Unsafe pointer usage
    var ptr unsafe.Pointer
    // ... unsafe operations
}
