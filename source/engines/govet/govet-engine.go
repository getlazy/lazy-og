
package main

import (
	"fmt"
	"net/http"
	"encoding/json"
)

type Metadata struct {
	Languages []string `json:"languages"`
}

type logEntry struct {
	Level string `json:"level"`
	Message string `json:"message"`
	Meta map[string]string `json:"meta"`
}

func logWithMetadata(level, message string, metadata map[string]string) {
	entry := &logEntry{level, message, metadata}
	marshaledEntry, err := json.Marshal(entry)
	if err != nil {
		logWithMetadata("error", "Failed to marshal log entry", map[string]string{"error": err.Error()})
		return
	}

	fmt.Println(string(marshaledEntry))
}

func log(level, message string) {
	logWithMetadata(level, message, nil)
}

func getStatusHandler(responseWriter http.ResponseWriter, request *http.Request) {
	log("info", "GET /status")
	responseWriter.WriteHeader(http.StatusOK)
}

func getMetaHandler(responseWriter http.ResponseWriter, request *http.Request) {
	meta := &Metadata{[]string{"go"}}
	log("info", "GET /meta")
	marshaledMeta, err := json.Marshal(meta)
	if err != nil {
		responseWriter.WriteHeader(http.StatusInternalServerError)
	} else {
		responseWriter.WriteHeader(http.StatusOK)
		responseWriter.Write(marshaledMeta)
	}
}

func postFileHandler(responseWriter http.ResponseWriter, request *http.Request) {
	log("info", "POST /file")
	responseWriter.WriteHeader(http.StatusOK)
}

func main() {
	http.HandleFunc("/status", getStatusHandler)
	http.HandleFunc("/meta", getMetaHandler)
	http.HandleFunc("/file", postFileHandler)
	log("info", "Engine started.")
	http.ListenAndServe(":80", nil)
}
