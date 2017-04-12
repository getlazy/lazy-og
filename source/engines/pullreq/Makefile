
PACKAGE_VERSION=$(shell node -pe "require('./package.json').version")

build:
	docker build \
		--build-arg NPM_TOKEN=${NPM_TOKEN} \
		-t getlazy/pullreq-engine:$(PACKAGE_VERSION) \
		-t getlazy/pullreq-engine:latest \
		.

push:
	docker push getlazy/pullreq-engine:$(PACKAGE_VERSION)
	docker push getlazy/pullreq-engine:latest

run:
	docker run -it --rm \
	    -v "$(shell pwd):/app" \
	    -v "/tmp:/lazy" \
	    -w /app \
	    ierceg/node-dev:6.10 \
	    node /app/index.js

test:
	docker run -it --rm \
	    -v "$(shell pwd):/app" \
	    -v "/tmp:/lazy" \
	    -w /app \
	    ierceg/node-dev:6.10 \
	    mocha

coverage:
	docker run -it --rm \
	    -v "$(shell pwd):/app" \
	    -v "/tmp:/lazy" \
	    -w /app \
	    ierceg/node-dev:6.10 \
	    istanbul cover _mocha -- --recursive
	docker run -it --rm \
	    -v "$(shell pwd):/app" \
	    -v "/tmp:/lazy" \
	    -w /app \
	    ierceg/node-dev:6.10 \
	    istanbul report text

.PHONY: *
