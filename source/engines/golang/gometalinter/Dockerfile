FROM golang:1.8
MAINTAINER The lazy Authors <team@getlazy.org>

COPY . /app
WORKDIR /app/

RUN go get -u github.com/alecthomas/gometalinter && gometalinter --install

STOPSIGNAL SIGINT
ENTRYPOINT ["gometalinter"]
