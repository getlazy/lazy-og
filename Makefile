
NPM_TOKEN?=public

build:
	NPM_TOKEN=${NPM_TOKEN} make -C source/lazy build
	NPM_TOKEN=${NPM_TOKEN} make -C source/tools/engine-docker-builder build
	NPM_TOKEN=${NPM_TOKEN} make -C source/engines/node-strategy-engine build
	NPM_TOKEN=${NPM_TOKEN} make -C source/engines/emcc build
	NPM_TOKEN=${NPM_TOKEN} make -C source/engines/yaml build
	NPM_TOKEN=${NPM_TOKEN} make -C source/engines/php-l build
	NPM_TOKEN=${NPM_TOKEN} make -C source/engines/pmd-java build
	NPM_TOKEN=${NPM_TOKEN} make -C source/engines/stylelint build
	NPM_TOKEN=${NPM_TOKEN} make -C source/engines/tidy-html build
	NPM_TOKEN=${NPM_TOKEN} make -C source/engines/pullreq build
	NPM_TOKEN=${NPM_TOKEN} make -C source/engines/github-access build
	NPM_TOKEN=${NPM_TOKEN} make -C source/engines/javascript build
	NPM_TOKEN=${NPM_TOKEN} make -C source/engines/reducer build
	NPM_TOKEN=${NPM_TOKEN} make -C source/engines/postprocessor build

push:
	make -C source/lazy push
	make -C source/tools/engine-docker-builder push
	make -C source/engines/node-strategy-engine push
	make -C source/engines/emcc push
	make -C source/engines/yaml push
	make -C source/engines/php-l push
	make -C source/engines/pmd-java push
	make -C source/engines/stylelint push
	make -C source/engines/tidy-html push
	make -C source/engines/pullreq push
	make -C source/engines/github-access push
	make -C source/engines/javascript push
	make -C source/engines/reducer push
	make -C source/engines/postprocessor push

install-pure:
	YARN_ARGS=--pure-lockfile make install

install:
	NPM_TOKEN=${NPM_TOKEN} make -C source/lazy install
	NPM_TOKEN=${NPM_TOKEN} make -C source/engines/node-strategy-engine install
	NPM_TOKEN=${NPM_TOKEN} make -C source/engines/emcc install
	NPM_TOKEN=${NPM_TOKEN} make -C source/engines/yaml install
	NPM_TOKEN=${NPM_TOKEN} make -C source/engines/php-l install
	NPM_TOKEN=${NPM_TOKEN} make -C source/engines/pmd-java install
	NPM_TOKEN=${NPM_TOKEN} make -C source/engines/stylelint install
	NPM_TOKEN=${NPM_TOKEN} make -C source/engines/tidy-html install
	NPM_TOKEN=${NPM_TOKEN} make -C source/engines/pullreq install
	NPM_TOKEN=${NPM_TOKEN} make -C source/engines/github-access install
	NPM_TOKEN=${NPM_TOKEN} make -C source/engines/javascript install
	NPM_TOKEN=${NPM_TOKEN} make -C source/engines/reducer install
	NPM_TOKEN=${NPM_TOKEN} make -C source/engines/postprocessor install

hack-crazy-diamond:
	docker run -it --rm \
		-v "$(shell pwd)/source/lazy:/app" \
		-v "$(shell pwd)/config:/config" \
		-v "$(shell pwd)/config/lazy-hack-crazy-diamond.yaml:/config/.mounted-lazy.yaml" \
		-v "/var/run/docker.sock:/var/run/docker.sock" \
		-p "16827:80" \
		--stop-signal SIGTERM \
		-w /app \
		-e NPM_TOKEN=$(NPM_TOKEN) \
		-e HOST_LAZY_SOURCE_PATH=$(shell pwd) \
		ierceg/node-dev:6.10 \
		nodemon -V -d 1 -L -w /app -w /config/.mounted-lazy.yaml index.js /config/.mounted-lazy.yaml

hack-node-backend:
	docker run -it --rm \
		-v "$(shell pwd)/source/lazy:/app" \
		-v "$(shell pwd)/config:/config" \
		-v "$(shell pwd)/config/lazy-hack-node-backend.yaml:/config/.mounted-lazy.yaml" \
		-v "/var/run/docker.sock:/var/run/docker.sock" \
		-p "16827:80" \
		--stop-signal SIGTERM \
		-w /app \
		-e NPM_TOKEN=$(NPM_TOKEN) \
		-e HOST_LAZY_SOURCE_PATH=$(shell pwd) \
		ierceg/node-dev:6.10 \
		nodemon -V -d 1 -L -w /app -w /config/.mounted-lazy.yaml index.js /config/.mounted-lazy.yaml

run-node-backend:
	docker run -it --rm \
		-v "$(shell pwd)/config:/config" \
		-v "$(shell pwd)/config/lazy-node-backend.yaml:/config/.mounted-lazy.yaml" \
		-v "/var/run/docker.sock:/var/run/docker.sock" \
		-p "16827:80" \
		--stop-signal SIGTERM \
		-w /app \
		-e NPM_TOKEN=$(NPM_TOKEN) \
		-e HOST_LAZY_SOURCE_PATH=$(shell pwrd) \
			getlazy/lazy:latest /config/.mounted-lazy.yaml

stop:
	docker stop $(docker ps -f "label=org.getlazy.lazy.engine-manager.owner.lazy-id=default" -q)

bash:
	docker run --rm -it \
		-v "$(shell pwd):/getlazy" \
		-w /getlazy \
		--env NPM_TOKEN=$(NPM_TOKEN) \
		node:6.10-alpine \
		sh

.PHONY: *
