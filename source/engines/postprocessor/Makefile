
PACKAGE_VERSION=$(shell node -pe "require('./package.json').version")
YARN_CACHE_DIR=$(shell yarn cache dir || echo ~/.yarn-cache)

build:
	docker build \
	    --build-arg NPM_TOKEN=$(NPM_TOKEN) \
	    -t getlazy/postprocessor-engine:$(PACKAGE_VERSION) \
	    -t getlazy/postprocessor-engine:latest \
	    .

push:
	docker push getlazy/postprocessor-engine:$(PACKAGE_VERSION)
	docker push getlazy/postprocessor-engine:latest

install:
	mkdir -p $(YARN_CACHE_DIR)
	docker run -it --rm \
	    -v "$(shell pwd):/app" \
	    -v "$(YARN_CACHE_DIR):/usr/local/share/.cache/yarn" \
	    -w /app \
	    --env NPM_TOKEN=$(NPM_TOKEN) \
	    ierceg/node-dev:6.10 \
	    yarn $(YARN_ARGS)

.PHONY: *
