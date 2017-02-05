
'use strict';

// lazy ignore no-console

const _ = require('lodash');
const Docker = require('node-docker-api').Docker;
const tar = require('tar-fs');
const async = require('async');

const tags = process.argv.splice(2);

const promisifyStream = stream => new Promise((resolve, reject) => {
    stream.on('data', (buffer) => {
        try {
            const jsonData = JSON.parse(buffer.toString());
            if (jsonData.stream) {
                console.log(_.trim(jsonData.stream));
            } else {
                console.log(jsonData);
            }
        } catch (e) {
            console.log(buffer.toString());
        }
    });
    stream.on('end', resolve);
    stream.on('error', reject);
});

const docker = new Docker({ socketPath: '/var/run/docker.sock' });

const tarStream = tar.pack('/sources');
docker.image.build(tarStream, {
    t: _.head(tags)
})
    .then(stream => promisifyStream(stream))
    .then(() => docker.image.status(_.head(tags)))
    .then((image) => {
        async.eachSeries(_.tail(tags), (tag, next) => {
            image.tag(tag)
                .then(() => next())
                .catch(next);
        });
    })
    .catch(console.error);
