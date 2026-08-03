package utils

import (
	"github.com/gofiber/fiber/v2"
)

// PaginationParams holds parsed pagination query parameters.
type PaginationParams struct {
	Page    int
	PerPage int
	Offset  int
}

const (
	defaultPage    = 1
	defaultPerPage = 20
	maxPerPage     = 100
)

// ParsePagination extracts and validates page & per_page query params.
func ParsePagination(c *fiber.Ctx) PaginationParams {
	page := c.QueryInt("page", defaultPage)
	perPage := c.QueryInt("per_page", defaultPerPage)

	if page < 1 {
		page = defaultPage
	}
	if perPage < 1 {
		perPage = defaultPerPage
	}
	if perPage > maxPerPage {
		perPage = maxPerPage
	}

	return PaginationParams{
		Page:    page,
		PerPage: perPage,
		Offset:  (page - 1) * perPage,
	}
}

// TotalPages calculates the total number of pages.
func TotalPages(total, perPage int) int {
	if perPage == 0 {
		return 0
	}
	pages := total / perPage
	if total%perPage != 0 {
		pages++
	}
	return pages
}
