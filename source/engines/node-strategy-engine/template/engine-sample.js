'use strict'

module.exports = {

	configure: (config) => {
		return new Promise((resolve, reject) => {
			// use config to boot up and get ready.
			resolve();
		});
	},

	shutDown: () => {
		return new Promise((resolve, reject) => {
			// cleanup
			resolve();
		});
	},

	handleRequest: (hostPath, language, content, context) => {
		return new Promise((resolve, reject) => {
			// do the job
			resolve();
		});
	},

	getMeta: () => {
		return {
			languages: ['JavaScript']
		};
	}

};