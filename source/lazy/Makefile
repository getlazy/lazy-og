
PACKAGE_VERSION=$(shell node -pe "require('./package.json').version")

build:
	docker build \
		-t ierceg/lazy-engines-stack:latest \
		-t ierceg/lazy-engines-stack:$(PACKAGE_VERSION) \
		.

build-spec-version:
	docker build \
		-t ierceg/lazy-engines-stack:$(PACKAGE_VERSION) \
		.

push-build:
	docker push ierceg/lazy-engines-stack:$(PACKAGE_VERSION)
	docker push ierceg/lazy-engines-stack:latest

.PHONY: *
