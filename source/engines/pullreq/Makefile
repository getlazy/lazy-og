
PACKAGE_VERSION=$(shell node -pe "require('./package.json').version")

build:
	docker build \
		--build-arg NPM_TOKEN=${NPM_TOKEN} \
		-t ierceg/lazy-pullreq-engine:$(PACKAGE_VERSION) \
		-t ierceg/lazy-pullreq-engine:latest \
		.

push:
	docker push ierceg/lazy-pullreq-engine:$(PACKAGE_VERSION)
	docker push ierceg/lazy-pullreq-engine:latest

run:
	docker run -it --rm \
	    -v "$(shell pwd):/app" \
	    -v "/tmp:/lazy" \
		-e "LAZY_VOLUME_NAME=/tmp" \
	    -w /app \
	    ierceg/node-dev:6.9.1 \
	    node /app/index.js

test:
	docker run -it --rm \
	    -v "$(shell pwd):/app" \
	    -v "/tmp:/lazy" \
		-e "LAZY_VOLUME_NAME=/tmp" \
	    -w /app \
	    ierceg/node-dev:6.9.1 \
	    mocha

coverage:
	docker run -it --rm \
	    -v "$(shell pwd):/app" \
	    -v "/tmp:/lazy" \
	    -e "LAZY_VOLUME_NAME=/tmp" \
	    -w /app \
	    ierceg/node-dev:6.9.1 \
	    istanbul cover _mocha -- --recursive
	docker run -it --rm \
	    -v "$(shell pwd):/app" \
	    -v "/tmp:/lazy" \
	    -e "LAZY_VOLUME_NAME=/tmp" \
	    -w /app \
	    ierceg/node-dev:6.9.1 \
	    istanbul report text

.PHONY: *
