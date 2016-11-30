
PACKAGE_VERSION=$(shell node -pe "require('./package.json').version")

build:
	docker build \
		-t ierceg/lazy-stylelint-server:$(PACKAGE_VERSION) \
		-t ierceg/lazy-stylelint-server:latest \
		.

push:
	docker push ierceg/lazy-stylelint-server:$(PACKAGE_VERSION)
	docker push ierceg/lazy-stylelint-server:latest

.PHONY: *
