package api

// Package api contains API models used across the project.

// Location represents the location data for an artist
type Location struct {
	ID        int      `json:"id"`
	Locations []string `json:"locations"`
	Dates     string   `json:"dates"`
}

// LocationsResponse represents the response from the locations API
type LocationsResponse struct {
	Index []Location `json:"index"`
}

// Dates represents concert dates for an artist
type Dates struct {
	ID    int      `json:"id"`
	Dates []string `json:"dates"`
}

// DatesResponse represents the dates API response
type DatesResponse struct {
	Index []Dates `json:"index"`
}

// Relations represents date-location mapping for an artist
type Relations struct {
	ID             int                 `json:"id"`
	DatesLocations map[string][]string `json:"datesLocations"`
}

// RelationsResponse represents the relations API response
type RelationsResponse struct {
	Index []Relations `json:"index"`
}

// This file ensures the package directory is recognized by the Go toolchain.
var _ = 0
