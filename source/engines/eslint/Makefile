
PACKAGE_VERSION=$(shell node -pe "require('./package.json').version")

build:
	docker build \
		-t ierceg/lazy-eslint-server:$(PACKAGE_VERSION) \
		-t ierceg/lazy-eslint-server:latest \
		.

push:
	docker push ierceg/lazy-eslint-server:$(PACKAGE_VERSION)
	docker push ierceg/lazy-eslint-server:latest

.PHONY: *
