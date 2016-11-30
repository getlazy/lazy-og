
PACKAGE_VERSION=$(shell node -pe "require('./package.json').version")

build:
	docker build \
		--build-arg NPM_TOKEN=${NPM_TOKEN} \
		-t ierceg/lazy-eslint-engine:$(PACKAGE_VERSION) \
		-t ierceg/lazy-eslint-engine:latest \
		.

push:
	docker push ierceg/lazy-eslint-engine:$(PACKAGE_VERSION)
	docker push ierceg/lazy-eslint-engine:latest

.PHONY: *
