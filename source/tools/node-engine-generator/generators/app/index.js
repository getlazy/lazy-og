'use strict';

const _ = require('lodash');
const Generator = require('yeoman-generator');
const path = require('path');
const askName = require('inquirer-npm-name');

module.exports = class extends Generator {

	constructor(args, opts) {
		super(args, opts);
	}

	initializing() {
		this.pkg = this.fs.readJSON(this.destinationPath('package.json'), {});

		// Pre set the default props from the information we have at this point
		this.props = {
			name: this.pkg.name,
			description: this.pkg.description,
			version: this.pkg.version,
			homepage: this.pkg.homepage
		};
	}

	prompting() {
		const self = this;

		return askName({
				name: 'name',
				message: 'Engine name:',
				default: path.basename(process.cwd()),
				filter: _.kebabCase,
				validate: (str) => {
					return str.length > 0;
				}
			}, self)
			.then((answer) => {
				self.props.name = answer.name;
				return self.prompt([{
						type: 'input',
						name: 'version',
						message: 'Engine version:',
						default: '1.0.0',
						when: !self.props.version
					}, {
						type: 'input',
						name: 'description',
						message: 'Engine description:',
						default: self.props.name,
						when: !self.props.description
					}, {
						type: 'input',
						name: 'homepage',
						message: 'Engine homepage url',
						when: !self.props.homepage
					}, {
						type: 'input',
						name: 'authorName',
						message: 'Author\'s name',
						when: !self.props.authorName,
						default: self.user.git.name()
					}, {
						type: 'input',
						name: 'keywords',
						message: 'Engine keywords (comma to split)',
						when: !self.pkg.keywords,
						filter: (words) => {
							return words.split(/\s*,\s*/g);
						}
					}, {
						type: 'input',
						name: 'githubAccount',
						message: 'GitHub username or organization:',
						default: self.props.githubAccount || ''
					}, {
						type: 'confirm',
						default: true,
						name: 'license',
						message: 'Include license?'
					}])
					.then((answers) => {
						self.props.description = answers.description;
						self.props.homepage = answers.homepage;
						self.props.authorName = answers.authorName;
						self.props.keywords = answers.keywords;
						self.props.version = answers.version;
						self.props.githubAccount = answers.githubAccount;
						self.props.license = answers.license;
						self.log(self.props);
					});
			});
	}

	writing() {
		// Re-read the content at this point it might be modie.
		const currentPkg = this.fs.readJSON(this.destinationPath('package.json'), {});

		const pkg = _.assignIn({
			name: _.kebabCase(this.props.name),
			version: this.props.version,
			description: this.props.description,
			homepage: this.props.homepage,
			author: {
				name: this.props.authorName
			},
			files: [
				'index.js',
				'engine.js',
				'test'
			],
			main: 'index.js',
			keywords: [],
			dependencies: {

			}
		}, currentPkg);

		// Combine the keywords
		if (this.props.keywords) {
			pkg.keywords = _.uniq(this.props.keywords.concat(pkg.keywords));
		}

		this.fs.writeJSON(this.destinationPath('package.json'), pkg);

		this.fs.copyTpl(
			this.templatePath('index.js'),
			this.destinationPath('index.js'), {}
		);
		this.fs.copyTpl(
			this.templatePath('engine.js'),
			this.destinationPath('engine.js'), {}
		);
		this.fs.copyTpl(
			this.templatePath('Dockerfile'),
			this.destinationPath('Dockerfile'), {
				author: this.props.authorName
			}
		);
		this.fs.copyTpl(
			this.templatePath('dockerignore'),
			this.destinationPath('.dockerignore'), {}
		);
		this.fs.copyTpl(
			this.templatePath('README.md'),
			this.destinationPath('README.md'), {
				name: this.props.name,
				desc: this.props.description
			}
		);
		this.fs.copyTpl(
			this.templatePath('Makefile'),
			this.destinationPath('Makefile'), {}
		);
		this.fs.copyTpl(
			this.templatePath('bootstrap.js'),
			this.destinationPath('test/bootstrap.js'), {}
		);
		this.fs.copyTpl(
			this.templatePath('test-engine-server.js'),
			this.destinationPath('test/test-engine-server.js'), {}
		);
		this.fs.copyTpl(
			this.templatePath('engine-test-cases.js'),
			this.destinationPath('test/fixtures/engine-test-cases.js'), {}
		);
		this.fs.copyTpl(
			this.templatePath('other-test-cases.js'),
			this.destinationPath('test/fixtures/other-test-cases.js'), {}
		);
	}

	default () {
		this.composeWith(require.resolve('../git'), {
			name: this.props.name,
			githubAccount: this.props.githubAccount
		});

		if (this.props.license) {
			this.composeWith(require.resolve('generator-license/app'), {});
		}
	}

	installing() {
		this.npmInstall(['lodash'], {
			save: true
		});
		this.npmInstall(['@lazyass/engine-helpers'], {
			save: true
		});
		this.npmInstall(['assert'], {
			'save-dev': true
		});
		this.npmInstall(['request'], {
			'save-dev': true
		});
		this.npmInstall(['rewire'], {
			'save-dev': true
		});
		this.npmInstall(['@lazyass/common'], {
			'save-dev': true
		});
		this.npmInstall(['winston'], {
			'save-dev': true
		});
		this.npmInstall(['testdouble'], {
			'save-dev': true
		});

		this.npmInstall();
	}
};
