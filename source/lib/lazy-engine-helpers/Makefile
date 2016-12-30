
test:
	@docker network create lazy-engine-helpers-test-network 2> /dev/null || :
	docker run -it --rm \
	    -v "$(shell pwd):/app" \
	    -v "/var/run/docker.sock:/var/run/docker.sock" \
	    -w /app \
	    --stop-signal SIGTERM \
	    --net=lazy-engine-helpers-test-network \
	    ierceg/node-dev:6.9.1 \
	    mocha

test-cont:
	@docker network create lazy-engine-helpers-test-network 2> /dev/null || :
	docker run -it --rm \
	    -v "$(shell pwd):/app" \
	    -v "/var/run/docker.sock:/var/run/docker.sock" \
	    -w /app \
	    --stop-signal SIGTERM \
	    --net=lazy-engine-helpers-test-network \
	    ierceg/node-dev:6.9.1 \
	    nodemon -V -d 1 -L -w /app --exec mocha

coverage:
	@docker network create lazy-engine-helpers-test-network 2> /dev/null || :
	docker run -it --rm \
	    -v "$(shell pwd):/app" \
	    -v "/var/run/docker.sock:/var/run/docker.sock" \
	    -w /app \
	    --stop-signal SIGTERM \
	    --net=lazy-engine-helpers-test-network \
	    ierceg/node-dev:6.9.1 \
	    istanbul cover _mocha -- --recursive
	docker run -it --rm \
	    -v "$(shell pwd):/app" \
	    -v "/var/run/docker.sock:/var/run/docker.sock" \
	    -w /app \
	    ierceg/node-dev:6.9.1 \
	    istanbul report text
	open coverage/lcov-report/index.html

.PHONY: *
