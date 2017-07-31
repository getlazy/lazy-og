
PACKAGE_VERSION=1.0

build:
	docker build \
	    -t getlazy/govet-engine:$(PACKAGE_VERSION) \
	    -t getlazy/govet-engine:latest \
	    .

push:
	docker push getlazy/govet-engine:$(PACKAGE_VERSION)
	docker push getlazy/govet-engine:latest

run:
	docker run -it --rm \
	    -v "$(shell pwd):/app" \
	    -v "/tmp:/lazy" \
	    -w /app \
	    go:1.8 \
	    go govet-engine

install:

.PHONY: *
