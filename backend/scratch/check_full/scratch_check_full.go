package main

import (
	"database/sql"
	"fmt"
	"os"

	"github.com/joho/godotenv"
	_ "github.com/lib/pq"
)

func main() {
	_ = godotenv.Load(".env")
	dsn := fmt.Sprintf(
		"postgresql://%s:%s@%s:%d/%s?sslmode=disable",
		os.Getenv("DB_USER"),
		os.Getenv("DB_PASSWORD"),
		"localhost", // Connect via host port mapping
		5432,
		os.Getenv("DB_NAME"),
	)
	fmt.Println("Connecting to:", dsn)

	db, err := sql.Open("postgres", dsn)
	if err != nil {
		fmt.Println("Error opening DB:", err)
		return
	}
	defer db.Close()

	// 1. Check registrations
	rows, err := db.Query("SELECT id, customer_number, full_name, status FROM registrations WHERE deleted_at IS NULL")
	if err != nil {
		fmt.Println("Error querying registrations:", err)
		return
	}
	defer rows.Close()

	fmt.Println("\n--- REGISTRATIONS ---")
	for rows.Next() {
		var id, custNum, name, status string
		if err := rows.Scan(&id, &custNum, &name, &status); err != nil {
			fmt.Println("Error scanning registration:", err)
			continue
		}
		fmt.Printf("ID: %s | CustNum: %s | Name: %s | Status: %s\n", id, custNum, name, status)
	}

	// 2. Check invoices
	invRows, err := db.Query("SELECT id, invoice_number, registration_id, status, amount FROM invoices")
	if err != nil {
		fmt.Println("Error querying invoices:", err)
		return
	}
	defer invRows.Close()

	fmt.Println("\n--- INVOICES ---")
	for invRows.Next() {
		var id, invNum, regID, status string
		var amount int64
		if err := invRows.Scan(&id, &invNum, &regID, &status, &amount); err != nil {
			fmt.Println("Error scanning invoice:", err)
			continue
		}
		fmt.Printf("ID: %s | InvNum: %s | RegID: %s | Status: %s | Amount: %d\n", id, invNum, regID, status, amount)
	}
}
