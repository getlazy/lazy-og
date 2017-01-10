
PACKAGE_VERSION=$(shell node -pe "require('./package.json').version")

build:
	docker build \
		-t getlazy/lazy:$(PACKAGE_VERSION) \
		-t getlazy/lazy:latest \
		.

push:
	docker push getlazy/lazy:$(PACKAGE_VERSION)
	docker push getlazy/lazy:latest

test:
	docker run -it --rm \
	    -v "$(shell pwd):/app" \
	    -v "/var/run/docker.sock:/var/run/docker.sock" \
	    -w /app \
	    --stop-signal SIGINT \
	    ierceg/node-dev:6.9.1 \
	    mocha

test-cont:
	docker run -it --rm \
	    -v "$(shell pwd):/app" \
	    -v "/var/run/docker.sock:/var/run/docker.sock" \
	    -w /app \
	    --stop-signal SIGINT \
	    ierceg/node-dev:6.9.1 \
	    nodemon -V -d 1 -L -w /app --exec mocha

coverage:
	docker run -it --rm \
	    -v "$(shell pwd):/app" \
	    -v "/var/run/docker.sock:/var/run/docker.sock" \
	    -w /app \
	    --stop-signal SIGINT \
	    ierceg/node-dev:6.9.1 \
	    istanbul cover _mocha -- --recursive
	docker run -it --rm \
	    -v "$(shell pwd):/app" \
	    -v "/var/run/docker.sock:/var/run/docker.sock" \
	    -w /app \
	    ierceg/node-dev:6.9.1 \
	    istanbul report text

.PHONY: *
