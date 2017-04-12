
test:
	docker run -it --rm \
	    -v "$(shell pwd):/app" \
	    -w /app \
	    --net=none \
	    ierceg/node-dev:6.10 \
	    mocha

test-cont:
	docker run -it --rm \
	    -v "$(shell pwd):/app" \
	    -w /app \
	    --net=none \
	    ierceg/node-dev:6.10 \
	    nodemon -V -d 1 -L -w /app --exec mocha

coverage:
	docker run -it --rm \
	    -v "$(shell pwd):/app" \
	    -w /app \
	    --net=none \
	    ierceg/node-dev:6.10 \
	    istanbul cover _mocha -- --recursive
	docker run -it --rm \
	    -v "$(shell pwd):/app" \
	    -w /app \
	    ierceg/node-dev:6.10 \
	    istanbul report text
	open coverage/lcov-report/index.html

.PHONY: *
