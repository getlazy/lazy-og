
PACKAGE_VERSION=$(shell node -pe "require('./package.json').version")

build:
	docker build \
		-t ierceg/lazy-eslint-server:$(PACKAGE_VERSION) \
		.

push:
	docker push ierceg/lazy-eslint-server:$(PACKAGE_VERSION)

.PHONY: *
