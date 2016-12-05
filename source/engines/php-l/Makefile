
PACKAGE_VERSION=$(shell node -pe "require('./package.json').version")

build:
	docker build \
		--build-arg NPM_TOKEN=${NPM_TOKEN} \
		-t ierceg/lazy-php-l-engine:$(PACKAGE_VERSION) \
		-t ierceg/lazy-php-l-engine:latest \
		.

push:
	docker push ierceg/lazy-php-l-engine:$(PACKAGE_VERSION)
	docker push ierceg/lazy-php-l-engine:latest

.PHONY: *
