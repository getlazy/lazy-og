# lazy-engine-docker-builder
Specialized builder for lazy engine docker images

This specialized builder is supposed to be used from within Docker itself. It will perform the following:

* Read sources including the source Dockerfile from `/sources`
* Read `/sources/metadata.yaml`
* Build the target image with source Dockerfile and labeling it with metadata in JSON format

Use this image in the following manner:

```
docker run --rm -it -v /var/run/docker.sock:/var/run/docker.sock -v "$(path to sources)":/sources getlazy/engine-docker-builder:latest <resulting image tag1> [<resulting image tag2>...]
```

Usually we put this into a Makefile like this:

```
build:
    docker run --rm -it \
        -v /var/run/docker.sock:/var/run/docker.sock \
        -v $(pwd):/sources \
        getlazy/engine-docker-builder:latest \
        tag1 tag2 tag3
```

To see an example see [Makefile](./Makefile) on how to build a new version of this image with the current version of it.
