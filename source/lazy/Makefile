
PACKAGE_VERSION=$(shell node -pe "require('./package.json').version")

build:
	docker build \
		--build-arg NPM_TOKEN=${NPM_TOKEN} \
		-t ierceg/lazy-engines-stack:$(PACKAGE_VERSION) \
		-t ierceg/lazy-engines-stack:latest \
		.

push:
	docker push ierceg/lazy-engines-stack:$(PACKAGE_VERSION)
	docker push ierceg/lazy-engines-stack:latest

.PHONY: *
