#/bin/bash
docker run -it --rm \
    -v "$(pwd)/source/lazy:/app" \
    -v "$(pwd)/config:/config" \
    -v "$(pwd)/source/lib/engine-pipeline:/app/node_modules/@getlazy/engine-pipeline" \
    -v "/var/run/docker.sock:/var/run/docker.sock" \
    -p "17731:80" \
    --stop-signal SIGTERM \
    -w /app \
    -e HOST_LAZY_SOURCE_PATH=$(pwd) \
    ierceg/node-dev:6.10 \
    nodemon -V -d 1 -L -w /app -w /config/$1 index.js /config/$1
