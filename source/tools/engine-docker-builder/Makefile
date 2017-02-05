
PACKAGE_VERSION=$(shell node -pe "require('./package.json').version")
YARN_CACHE_DIR=$(shell yarn cache dir || echo $(shell pwd)/.yarn-cache)

build:
	docker run \
		--rm -it \
		-v /var/run/docker.sock:/var/run/docker.sock \
		-v "$(shell pwd):/sources" \
		-v "$(YARN_CACHE_DIR):/usr/local/share/.cache/yarn" \
		--env NPM_TOKEN=${NPM_TOKEN} \
		getlazy/engine-docker-builder:latest \
		getlazy/engine-docker-builder:${PACKAGE_VERSION} \
		getlazy/engine-docker-builder:latest

push:
	docker push getlazy/engine-docker-builder:${PACKAGE_VERSION}
	docker push getlazy/engine-docker-builder:latest

bootstrap-build:
	docker build \
		--build-arg NPM_TOKEN=${NPM_TOKEN} \
		-v "$(YARN_CACHE_DIR):/usr/local/share/.cache/yarn"
		-t getlazy/engine-docker-builder:${PACKAGE_VERSION} \
		-t getlazy/engine-docker-builder:latest \
		.
