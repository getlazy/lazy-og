
'use strict';

// lazy ignore no-console

const _ = require('lodash');
const Docker = require('node-docker-api').Docker;
const tar = require('tar-fs');
const async = require('async');
const fs = require('fs-extra');
const parser = require('gitignore-parser');

const tags = process.argv.splice(2);
const dockerIgnore = parser.compile(fs.readFileSync('/sources/.dockerignore', 'utf8'));

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

fs.readFile('/sources/metadata.json', (err, metadata) => {
    if (!err && metadata) {
        // Normalize JSON.
        try {
            // lazy ignore no-param-reassign
            metadata = JSON.stringify(JSON.parse(metadata));
        } catch (parseErr) {
            console.error('Invalid metadata:', parseErr);
            process.exit(-1);
        }
    }

    // TODO: Use .dockerignore if it exists in sources to ignore the files during compression.
    const tarStream = tar.pack('/sources', {
        ignore: name => dockerIgnore.denies(_.trimStart(name, '/sources/'))
    });
    const buildTag = _.head(tags);
    const buildParams = {
        t: buildTag,
        buildargs: {
            NPM_TOKEN: process.env.NPM_TOKEN
        },
        labels: {
            'org.getlazy.lazy.engine.metadata': metadata
        }
    };
    docker.image.build(tarStream, buildParams)
        .then(stream => promisifyStream(stream))
        .then(() => docker.image.status(buildTag))
        .then(image => new Promise((resolve, reject) => {
            async.eachSeries(_.tail(tags), (completeTag, next) => {
                const [repo, tag] = completeTag.split(':');
                console.log('tagging image with', { repo, tag });
                image.tag({ repo, tag })
                    .then(() => next())
                    .catch(next);
            }, (seriesErr) => {
                if (seriesErr) {
                    reject(seriesErr);
                    return;
                }

                resolve(image);
            });
        }))
        .catch(console.error);
});
