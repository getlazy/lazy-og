
PACKAGE_VERSION=$(shell node -pe "require('./package.json').version")

build:
	docker build \
		--build-arg NPM_TOKEN=${NPM_TOKEN} \
		-t ierceg/lazy-emcc-engine:$(PACKAGE_VERSION) \
		-t ierceg/lazy-emcc-engine:latest \
		.

push:
	docker push ierceg/lazy-emcc-engine:$(PACKAGE_VERSION)
	docker push ierceg/lazy-emcc-engine:latest

.PHONY: *
