
PACKAGE_VERSION=$(shell node -pe "require('./package.json').version")
YARN_CACHE_DIR=$(shell yarn cache dir || echo ~/.yarn-cache)

build:
	docker build \
	    --build-arg NPM_TOKEN=$(NPM_TOKEN) \
	    -t getlazy/javascript-engine:$(PACKAGE_VERSION) \
	    -t getlazy/javascript-engine:latest \
	    .

push:
	docker push getlazy/javascript-engine:$(PACKAGE_VERSION)
	docker push getlazy/javascript-engine:latest

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
