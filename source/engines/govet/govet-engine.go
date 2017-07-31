
package main

import (
	"fmt"
	"net/http"
	"encoding/json"
)

type Metadata struct {
	Languages []string `json:languages`
}

func getStatusHandler(responseWriter http.ResponseWriter, request *http.Request) {
	fmt.Println("{\"message\":\"GET /status\"}")
	responseWriter.WriteHeader(http.StatusOK)
}

func getMetaHandler(responseWriter http.ResponseWriter, request *http.Request) {
	fmt.Println("{\"message\":\"GET /meta\"}")
	meta := &Metadata{[]string{"go"}}
	marshaledMeta, err := json.Marshal(meta)
	if err != nil {
		responseWriter.WriteHeader(http.StatusInternalServerError)
	} else {
		responseWriter.WriteHeader(http.StatusOK)
		responseWriter.Write(marshaledMeta)
	}
}

func postFileHandler(responseWriter http.ResponseWriter, request *http.Request) {
	fmt.Println("{\"message\":\"POST /file\"}")
	responseWriter.WriteHeader(http.StatusOK)
}

func main() {
	http.HandleFunc("/status", getStatusHandler)
	http.HandleFunc("/meta", getMetaHandler)
	http.HandleFunc("/file", postFileHandler)
	fmt.Println("{\"message\":\"Engine started.\"}")
	http.ListenAndServe(":80", nil)
}
