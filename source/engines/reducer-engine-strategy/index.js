'use strict'

const _ = require('lodash');

const _reduceWarnings = (allWarnings, maxWarningsPerRule, maxWarningsPerFile) => {
	const allEnginesResults = {
		warnings: []
	};

	//  Reduce the number of warnings per max warnings per rule and max warnings
	//  settings.
	const reducedWarnings = _(allWarnings)
		.groupBy('ruleId')
		.mapValues((warnings, ruleId) => {
			if (!_.isNumber(maxWarningsPerRule) ||
				warnings.length <= maxWarningsPerRule ||
				ruleId === 'undefined') {
				return warnings;
			}
			const firstWarning = _.head(_.sortBy(warnings, 'line'));

			//  Use the first warning plus an info on the same line with the number
			//  of warnings left for the same rule.
			return [firstWarning, _.assignIn(_.clone(firstWarning), {
				type: 'Info',
				message: `+ ${warnings.length - 1} other warnings of [${ruleId}] rule`
			})];
		})
		.flatMap()
		//  If max warnings is defined then limit the number of warnings.
		.take(_.isNumber(maxWarningsPerFile) ? maxWarningsPerFile : allEnginesResults.warnings.length)
		.value();
	allEnginesResults.warnings = reducedWarnings;
	return allEnginesResults;
};

module.exports = {

	configure: (config) => {
		return Promise.resolve();
	},

	shutDown: () => {
		return Promise.resolve();
	},

	handleRequest: (hostPath, language, content, context) => {
		return new Promise((resolve) => {
			const prevWarnings = _.get(context, 'previousStepResults.warnings');
			if (_.isNil(prevWarnings)) { // nothing from the previos engines
				resolve({
					warnings: []
				});
				return;
			}
			const maxWarningsPerRule = _.parseInt(_.get(context, 'engineParams.maxWarningsPerRule', 4));
			const maxWarningsPerFile = _.parseInt(_.get(context, 'engineParams.maxWarningsPerFile', 200));
			const reducedWarnings = _reduceWarnings(prevWarnings, maxWarningsPerRule, maxWarningsPerFile);

			resolve(reducedWarnings);
		});
	},

	getMeta: () => {
		return {
			languages: []
		};
	},

};