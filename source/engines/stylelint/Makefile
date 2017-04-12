
PACKAGE_VERSION=$(shell node -pe "require('./package.json').version")

build:
	docker build \
		--build-arg NPM_TOKEN=${NPM_TOKEN} \
		-t getlazy/stylelint-engine:$(PACKAGE_VERSION) \
		-t getlazy/stylelint-engine:latest \
		.

push:
	docker push getlazy/stylelint-engine:$(PACKAGE_VERSION)
	docker push getlazy/stylelint-engine:latest

run:
	docker run -it --rm \
	    -v "$(shell pwd):/app" \
	    -v "/tmp:/lazy" \
	    -w /app \
	    ierceg/node-dev:6.10 \
	    node /app/index.js

test:
	docker run -it --rm \
	    -v "$(shell pwd):/app" \
	    -v "/tmp:/lazy" \
	    -w /app \
	    ierceg/node-dev:6.10 \
	    mocha

coverage:
	docker run -it --rm \
	    -v "$(shell pwd):/app" \
	    -v "/tmp:/lazy" \
	    -w /app \
	    ierceg/node-dev:6.10 \
	    istanbul cover _mocha -- --recursive
	docker run -it --rm \
	    -v "$(shell pwd):/app" \
	    -v "/tmp:/lazy" \
	    -w /app \
	    ierceg/node-dev:6.10 \
	    istanbul report text

.PHONY: *
