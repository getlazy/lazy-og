
PACKAGE_VERSION=$(shell node -pe "require('./package.json').version")
YARN_CACHE_DIR=$(shell yarn cache dir || echo $(shell pwd)/.yarn-cache)

build:
	docker run --rm \
		-v /var/run/docker.sock:/var/run/docker.sock \
		-v "$(shell pwd):/sources" \
		-v "$(YARN_CACHE_DIR):/usr/local/share/.cache/yarn" \
		--env NPM_TOKEN=${NPM_TOKEN} \
		getlazy/engine-docker-builder:latest \
		getlazy/tidy-html-engine:$(PACKAGE_VERSION) \
		getlazy/tidy-html-engine:latest

push:
	docker push getlazy/tidy-html-engine:$(PACKAGE_VERSION)
	docker push getlazy/tidy-html-engine:latest

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

install:
	docker run -it --rm \
	    -v "$(shell pwd):/app" \
	    -w /app \
	    --stop-signal SIGINT \
	    --env NPM_TOKEN=$(NPM_TOKEN) \
	    ierceg/node-dev:6.10 \
	    yarn $(YARN_ARGS)

.PHONY: *
