
'use strict';

const fs = require('fs');
const yaml = require('js-yaml');

class LazyYamlFile {
    static load(filePath) {
        return new Promise((resolve, reject) => {
            fs.readFile(filePath, 'utf8', (err, content) => {
                if (err) {
                    return reject(err);
                }

                resolve(yaml.safeLoad(content));
            });
        });
    }

    static save(filePath, data) {
        return new Primise((resolve, reject) => {
            const content = yaml.safeDump(data, {
                indent: 4
            });
            fs.writeFile(filePath, content, (err) => {
                if (err) {
                    return reject(err);
                }

                resolve();
            })
        });
    }
}

module.exports = LazyYamlFile;
