
PACKAGE_VERSION=$(shell node -pe "require('./package.json').version")

build:
	docker build \
		--build-arg NPM_TOKEN=${NPM_TOKEN} \
		-t getlazy/node-strategy-engine:$(PACKAGE_VERSION) \
		-t getlazy/node-strategy-engine:latest \
		.

push:
	docker push getlazy/node-strategy-engine:$(PACKAGE_VERSION)
	docker push getlazy/node-strategy-engine:latest

run:
	docker run -it --rm \
	    -v "$(shell pwd):/app" \
	    -v "/tmp:/lazy" \
	    -w /app \
	    ierceg/node-dev:6.10 \
	    node /app/index.js

.PHONY: *
