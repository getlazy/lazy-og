
PACKAGE_VERSION=$(shell node -pe "require('./package.json').version")
YARN_CACHE_DIR=$(shell yarn cache dir || echo ~/.yarn-cache)

build:
	docker build \
		-t getlazy/gometalinter:$(PACKAGE_VERSION) \
		-t getlazy/gometalinter:latest \
		gometalinter
	docker run --rm \
		-v /var/run/docker.sock:/var/run/docker.sock \
		-v "$(shell pwd):/sources" \
		-v "$(YARN_CACHE_DIR):/usr/local/share/.cache/yarn" \
		getlazy/engine-docker-builder:latest \
		getlazy/golang-engine:$(PACKAGE_VERSION) \
		getlazy/golang-engine:latest

push:
	docker push getlazy/gometalinter:$(PACKAGE_VERSION)
	docker push getlazy/gometalinter:latest
	docker push getlazy/golang-engine:$(PACKAGE_VERSION)
	docker push getlazy/golang-engine:latest

run:
	docker run -it --rm \
	    -v "$(shell pwd):/app" \
	    -v "/tmp:/lazy" \
	    -w /app \
	    ierceg/node-dev:6.10 \
	    node /app/index.js

install:
	mkdir -p $(YARN_CACHE_DIR)
	docker run -it --rm \
	    -v "$(shell pwd):/app" \
	    -v "$(YARN_CACHE_DIR):/usr/local/share/.cache/yarn" \
	    -w /app \
	    --env NPM_TOKEN=$(NPM_TOKEN) \
	    ierceg/node-dev:6.10 \
	    yarn --cache-folder /usr/local/share/.cache/yarn $(YARN_ARGS)

.PHONY: *
