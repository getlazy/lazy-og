'use strict';

const _ = require('lodash');
const Generator = require('yeoman-generator');
const originUrl = require('git-remote-origin-url');
const githubUsername = require('github-username');


module.exports = class extends Generator {
    constructor(args, opts) {
        super(args, opts);
        this.option('name', {
            type: String,
            required: true,
            desc: 'Module name'
        });

        this.option('github-account', {
            type: String,
            required: true,
            desc: 'GitHub username or organization'
        });
    };

    initializing() {
        this.fs.copy(
            this.templatePath('gitignore'),
            this.destinationPath('.gitignore')
        );

        return originUrl(this.destinationPath())
            .then((url) => {
                this.originUrl = url;
            })
            .catch((err) => {
                this.originUrl = '';
            });

    }

    writing() {
        this.pkg = this.fs.readJSON(this.destinationPath('package.json'), {});

        var repository = '';
        if (this.originUrl) {
            repository = this.originUrl;
        }
        else {
            repository = this.options.githubAccount + '/' + this.options.name;
        }

        this.pkg.repository = this.pkg.repository || repository;

        this.fs.writeJSON(this.destinationPath('package.json'), this.pkg);
    }

    end() {
        this.spawnCommandSync('git', ['init'], {
            cwd: this.destinationPath()
        });

        if (!this.originUrl) {
            var repoSSH = this.pkg.repository;
            if (this.pkg.repository && this.pkg.repository.indexOf('.git') === -1) {
                repoSSH = 'git@github.com:' + this.pkg.repository + '.git';
            }
            this.spawnCommandSync('git', ['remote', 'add', 'origin', repoSSH], {
                cwd: this.destinationPath()
            });
        }
    }
}
