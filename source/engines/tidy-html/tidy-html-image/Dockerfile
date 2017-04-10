# Forked from https://github.com/SBallert/dockerfiles/blob/master/tidy_html5/Dockerfile (MIT license)

FROM alpine:3.4
MAINTAINER The lazy Authors <team@getlazy.org>


ENV TIDY_VERSION 5.2.0

RUN set -ex \
    apk update && apk --no-cache add \
        curl \
        tar \
        alpine-sdk \
        cmake \
    && curl "https://codeload.github.com/htacg/tidy-html5/tar.gz/${TIDY_VERSION}" \
        | tar -xz -C /tmp \
    && cd "/tmp/tidy-html5-${TIDY_VERSION}/build/cmake" \
    && cmake ../.. -DCMAKE_BUILD_TYPE=Release \
    && make \
    && make install

WORKDIR /source

ENTRYPOINT ["tidy"]

CMD ["--help"]
