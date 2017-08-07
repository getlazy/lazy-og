
package main

import (
	"fmt"
	"net/http"
	"encoding/json"
	"io/ioutil"
	"os"
	"os/exec"
	"strings"
)

type metadata struct {
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
	log("info", "GET /meta")

	// This engine supports go language.
	meta := &metadata{[]string{"go"}}
	marshaledMeta, err := json.Marshal(meta)
	if err != nil {
		logWithMetadata("error", "Failed to marshal metadata", map[string]string{"error": err.Error()})
		responseWriter.WriteHeader(http.StatusInternalServerError)
		return
	}

	responseWriter.WriteHeader(http.StatusOK)
	responseWriter.Write(marshaledMeta)
}

func postFileHandler(responseWriter http.ResponseWriter, request *http.Request) {
	log("info", "POST /file")

	decoder := json.NewDecoder(request.Body)
	var body interface{}
	err := decoder.Decode(&body)
	if err != nil {
		logWithMetadata("error", "Failed to decode request body", map[string]string{"error": err.Error()})
		responseWriter.WriteHeader(http.StatusInternalServerError)
		return
	}

	defer request.Body.Close()

	bodyMap, bodyIsMap := body.(map[string]interface{})
	if !bodyIsMap {
		log("error", "Request body is invalid")
		responseWriter.WriteHeader(http.StatusInternalServerError)
		return
	}

	content, contentIsString := bodyMap["content"].(string)
	if !contentIsString {
		log("error", "Request file content is invalid")
		responseWriter.WriteHeader(http.StatusInternalServerError)
		return
	}

	// Save the content of the file in the temporary directory so that we can run analysis on it.
	tmpFile, err := ioutil.TempFile("/lazy", "lazy-temp-content-")
	if err != nil {
		logWithMetadata("error", "Failed to open temporary file", map[string]string{"error": err.Error()})
		responseWriter.WriteHeader(http.StatusInternalServerError)
		return
	}

	_, err = tmpFile.WriteString(content)
	if err != nil {
		tmpFile.Close()
		logWithMetadata("error", "Failed to write to temporary file", map[string]string{"error": err.Error()})
		responseWriter.WriteHeader(http.StatusInternalServerError)
		return
	}

	// We are closing the temp file early so that we can rename it.
	err = tmpFile.Close()
	if err != nil {
		logWithMetadata("error", "Failed to sync temporary file to persistent storage", map[string]string{"error": err.Error()})
		responseWriter.WriteHeader(http.StatusInternalServerError)
		return
	}

	// Rename the file to have extension .go - otherwise gometalinter ignores it.
	tmpGoFileFullPath := tmpFile.Name() + ".go"
	fmt.Println("Renaming", tmpFile.Name(), "to", tmpGoFileFullPath)
	err = os.Rename(tmpFile.Name(), tmpGoFileFullPath)
	if err != nil {
		logWithMetadata("error", "Failed to rename temporary file", map[string]string{"error": err.Error()})
		responseWriter.WriteHeader(http.StatusInternalServerError)
		return
	}

	// Delete the temp file after we have finished with it.
	defer os.RemoveAll(tmpGoFileFullPath)

	// Run gometalinter
	err = runGometalinter(tmpGoFileFullPath)
	if err != nil {
		logWithMetadata("error", "Failed to run go vet", map[string]string{"error": err.Error()})
		responseWriter.WriteHeader(http.StatusInternalServerError)
		return
	}

	responseWriter.WriteHeader(http.StatusOK)
	responseWriter.Write([]byte("{}"))
}

func processGometalinterOutput(rawOutput []byte) {
	output := string(rawOutput)
	lines := strings.Split(output, "\r")
	fmt.Println(lines)
}

func runGometalinter(filename string) error {
	cmd := exec.Command("gometalinter", filename)
	stdoutStderr, err := cmd.CombinedOutput()
	// gometalinter will issue error on incorrect runs (e.g. bad file name) and on runs that return
	// any kind of warnings or errors. So we have to always process the results.
	if err != nil {
		processGometalinterOutput(stdoutStderr)
		return err
	}
	processGometalinterOutput(stdoutStderr)
	return err
}

func main() {
	http.HandleFunc("/status", getStatusHandler)
	http.HandleFunc("/meta", getMetaHandler)
	http.HandleFunc("/file", postFileHandler)
	log("info", "Engine started.")
	http.ListenAndServe(":80", nil)
}
