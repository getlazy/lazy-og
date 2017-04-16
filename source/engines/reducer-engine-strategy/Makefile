
PACKAGE_VERSION=$(shell node -pe "require('./package.json').version")
YARN_CACHE_DIR=$(shell yarn cache dir || echo ~/.yarn-cache)

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
