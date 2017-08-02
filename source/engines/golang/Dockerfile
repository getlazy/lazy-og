FROM golang:1.8
MAINTAINER The lazy Authors <team@getlazy.org>

COPY . /app
WORKDIR /app/

#RUN go get -u github.com/golang/lint/golint
RUN go build

STOPSIGNAL SIGINT
ENTRYPOINT ["/app/app"]
