package main

import (
	"database/sql"
	"fmt"
	"os"

	_ "github.com/lib/pq"
)

func main() {
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		dsn = "postgres://postgres:postgres@localhost:5432/isp_platform?sslmode=disable"
	}
	db, err := sql.Open("postgres", dsn)
	if err != nil {
		fmt.Println("Error connecting to DB:", err)
		return
	}
	defer db.Close()

	var totalActive int
	err = db.QueryRow("SELECT COUNT(*) FROM registrations WHERE status = 'active' AND deleted_at IS NULL").Scan(&totalActive)
	if err != nil {
		fmt.Println("Query error:", err)
		return
	}
	fmt.Printf("Total Active Registrations in DB: %d\n", totalActive)

	var totalAll int
	err = db.QueryRow("SELECT COUNT(*) FROM registrations WHERE deleted_at IS NULL").Scan(&totalAll)
	if err != nil {
		fmt.Println("Query error:", err)
		return
	}
	fmt.Printf("Total Registrations in DB: %d\n", totalAll)
}
