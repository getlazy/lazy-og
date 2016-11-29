
'use strict';

const _ = require('lodash');

/**
 * Factory for Client classes.
 */
class ClientFactory
{
    constructor() {
        const self = this;
        const clients = require('require-all')(__dirname + '/clients');

        self._clients = {};
        _.each(clients, (client) => {
            console.log(client.version);
            self._clients[client.version] = client;
        });
    }

    getClientClass(version) {
        const self = this;

        const clientClass = self._clients[version];
        if (_.isObject(clientClass)) {
            return clientClass;
        }

        return null;
    }
}

module.exports = new ClientFactory();
