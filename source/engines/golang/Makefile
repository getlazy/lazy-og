
PACKAGE_VERSION=$(shell node -pe "require('./package.json').version")

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
	    /app/app

install:

.PHONY: *
