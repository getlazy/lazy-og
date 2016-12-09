
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

test:
	docker run -it --rm \
	    -v "$(shell pwd):/app" \
	    -v "/var/run/docker.sock:/var/run/docker.sock" \
	    -v "/tmp:/lazy" \
		-e "LAZY_VOLUME_NAME=/tmp" \
	    -w /app \
	    ierceg/node-dev:6.9.1 \
	    mocha

coverage:
	docker run -it --rm \
	    -v "$(shell pwd):/app" \
	    -v "/var/run/docker.sock:/var/run/docker.sock" \
	    -v "/tmp:/lazy" \
	    -e "LAZY_VOLUME_NAME=/tmp" \
	    -w /app \
	    ierceg/node-dev:6.9.1 \
	    istanbul cover _mocha -- --recursive
	docker run -it --rm \
	    -v "$(shell pwd):/app" \
	    -v "/var/run/docker.sock:/var/run/docker.sock" \
	    -v "/tmp:/lazy" \
	    -e "LAZY_VOLUME_NAME=/tmp" \
	    -w /app \
	    ierceg/node-dev:6.9.1 \
	    istanbul report text

.PHONY: *
