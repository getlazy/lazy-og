
build:
	make -C source/lazy build
	make -C source/tools/engine-docker-builder build
	make -C source/engines/node-strategy-engine build
	make -C source/engines/emcc build
	make -C source/engines/yaml build
	make -C source/engines/php-l build
	make -C source/engines/pmd-java build
	make -C source/engines/stylelint build
	make -C source/engines/tidy-html build
	make -C source/engines/pullreq build
	make -C source/engines/github-access build

run:
	docker run -it --rm \
	    -v "$(shell pwd)/config/default:/config" \
	    -v "/var/run/docker.sock:/var/run/docker.sock" \
	    -p "16827:80" \
	    --link elk \
	    --stop-signal SIGTERM \
	    -w /app \
	    -e NPM_TOKEN=$(NPM_TOKEN) \
		-e HOST_LAZY_SOURCE_PATH=$(shell pwrd) \
	    getlazy/lazy:latest /config/lazy.yaml

install-pure:
	YARN_ARGS=--pure-lockfile make install

install:
	make -C source/lazy install
	make -C source/engines/node-strategy-engine install
	make -C source/engines/emcc install
	make -C source/engines/yaml install
	make -C source/engines/php-l install
	make -C source/engines/pmd-java install
	make -C source/engines/stylelint install
	make -C source/engines/tidy-html install
	make -C source/engines/pullreq install
	make -C source/engines/github-access install
	make -C source/engines/javascript-engine-strategy install
	make -C source/engines/reducer-engine-strategy install
	make -C source/engines/postprocessor-engine-strategy install

hack:
	docker run -it --rm \
		-v "$(shell pwd)/source/lazy:/app" \
	    -v "$(shell pwd)/config/hack:/config" \
	    -v "/var/run/docker.sock:/var/run/docker.sock" \
	    -p "16827:80" \
	    --stop-signal SIGTERM \
	    -w /app \
	    -e NPM_TOKEN=$(NPM_TOKEN) \
	    -e HOST_LAZY_SOURCE_PATH=$(shell pwd) \
	    ierceg/node-dev:6.10 \
	    nodemon -V -d 1 -L -w /app -w /config.lazy.yaml index.js /config/lazy.yaml

bash:
	docker run --rm -it \
		-v "$(shell pwd):/getlazy" \
		-w /getlazy \
		--env NPM_TOKEN=$(NPM_TOKEN) \
		node:6.10-alpine \
		sh

.PHONY: *
