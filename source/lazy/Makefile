
PACKAGE_VERSION=$(shell node -pe "require('./package.json').version")

build:
	docker build \
		--build-arg NPM_TOKEN=${NPM_TOKEN} \
		-t ierceg/lazy:$(PACKAGE_VERSION) \
		-t ierceg/lazy:latest \
		.

push:
	docker push ierceg/lazy:$(PACKAGE_VERSION)
	docker push ierceg/lazy:latest

.PHONY: *
