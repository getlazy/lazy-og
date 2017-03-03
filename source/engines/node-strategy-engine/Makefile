
PACKAGE_VERSION=$(shell node -pe "require('./package.json').version")

build:
	docker build \
		--build-arg NPM_TOKEN=${NPM_TOKEN} \
		-t getlazy/engine-container:$(PACKAGE_VERSION) \
		-t getlazy/engine-container:latest \
		.

push:
	docker push getlazy/engine-container:$(PACKAGE_VERSION)
	docker push getlazy/engine-container:latest

run:
	docker run -it --rm \
	    -v "$(shell pwd):/app" \
	    -v "/tmp:/lazy" \
		-e "LAZY_VOLUME_NAME=/tmp" \
	    -w /app \
	    ierceg/node-dev:6.9.1 \
	    node /app/index.js


.PHONY: *
