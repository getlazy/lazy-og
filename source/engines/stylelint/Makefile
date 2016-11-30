
PACKAGE_VERSION=$(shell node -pe "require('./package.json').version")

build:
	docker build \
		--build-arg NPM_TOKEN=${NPM_TOKEN} \
		-t ierceg/lazy-stylelint-engine:$(PACKAGE_VERSION) \
		-t ierceg/lazy-stylelint-engine:latest \
		.

push:
	docker push ierceg/lazy-stylelint-engine:$(PACKAGE_VERSION)
	docker push ierceg/lazy-stylelint-engine:latest

.PHONY: *
