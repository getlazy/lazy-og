
# lazy

Hackable Coding Assistant

## Features

* Single point to run all your code analysis
* Comes with a set of built-in code analysis engines
* Gives you tools to create your own engines and shared them with others

## Installation

* Install Docker
* Run `curl ... | sh` - this will setup `lazy` and start it as daemon
* Install `lazy` package for your editor of choice

## Supported editors

### Atom

* [linter-lazy](https://atom.io/packages/linter-lazy) for Atom's [Linter](https://atom.io/packages/linter)

## Engines

Engines are Docker containers running an HTTP server which follows the API specification. Reference implementation of such server for NodeJS can be found in [lazy-engine-reference-node](https://github.com/SoftwareMarbles/lazy-engine-reference-node) repository.

### Lifecycle

During its lifecycle an engine will go through the following stages:

* create: lazy creates the engine's container and starts the container
* start: immediately on container's start the engine will initialize itself and start its HTTP server
* run: once engine is running lazy will query it for metadata and based on it, lazy will start forwarding all corresponding requests to the engine
* stop: lazy will signal the container to stop at which point engine will gracefully stop itself and lazy will delete the stopped container

## Common requests

All lazy engines should respond to the following HTTP requests:

* `GET /status`: engine should return 503 until it's ready to start serving requests at which point it should return 200, body is ignored
* `GET /meta`: returns engine's metadata in the response body

Some engines might not have these endpoints in which case you can specify metadata in lazy.yaml (`meta` engine configuration clause) as well as instructing lazy to not wait for the engine to start (`boot_wait` engine configuration clause set to `false`)

### Metadata

Engine metadata structure has the following properties:

* `languages`: an array of strings with the names of languages that the engine supports, empty if the engine is meant to support all languages

## Additional requests

Engines, depending on their purpose, might also respond to one or more of the following events:

* `POST /file`: signals that a file has been changed and that the engine should now process it

### `POST /file`

Analyzes the given file content for the given language and analysis context.

#### Headers

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `X-LazyClient-Version` | string | yes | lazy API version that client is using. |

#### Request

lazy expects the following body for request:

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `hostPath` | string | yes | Path of the source file on the host. |
| `language` | string | yes | Language of the source file. |
| `instanceUrl` | string | yes | Content of the source file requesting lazy to analyze. |
| `context` | object | yes | Context information included with the request. |

Context information may consists of anything that client deems relevant. At the moment, our engines use the following:

| Property | Type | Description |
|----------|------|-------------|
| `host` | string | Name of the host making the request. |
| `client` | string | Name and version of the client making the request. |
| `repositoryInformation` | object | Remotes and status of the repository to which the file belongs, if any. |

Repository information may further contain:

| Property | Type | Description |
|----------|------|-------------|
| `remotes` | array | Array of objects describing the remotes registered with the repository. |
| `status` | object | Object containing properties and values of the repository's current status. |
| `branches` | object | Object containing names of all branches and their respective information. |

#### Response

lazy responds with the following body:

| Property | Type | Description |
|----------|------|-------------|
| `warnings` | array | Array of warnings objects that are the result of the analysis. |

Each warning object consists may contain:

| Property | Type | Description |
|----------|------|-------------|
| `type` | string | `Error`, `Warning` or `Info` value describing the level of the warning. |
| `message` | string | The message of the warning. |
| `line` | number | The line with which the message is associated. |
| `column` | number | The column with which the message is associated. |

### Conventions

Currently lazy creates a private volume for all engines to access and this volume is mounted as `/lazy` inside of engines. At this moment this isn't configurable. Furthermore, each engine gets is own sandbox in `/lazy/sandbox/<engine-name>` where engine name is whatever was defined in `lazy.yaml` (note that this means that names of the engines should remain stable).

### Graceful termination

Engines should shut down gracefully when stopped by Docker. In our official engines we use `SIGTERM` signal for this. In Dockerfile we specify the following:

```
STOPSIGNAL SIGTERM
```

And in the engine code we then monitor for `SIGTERM` signal and try to gracefully shut down. If for whatever reason you don't want to use `SIGTERM`, you can use something else as lazy relies on Docker to send the signal so whatever you define in `STOPSIGNAL` will be sent.

### Helper containers

lazy binds Docker socket to all engines it is running so all engines have full access to Docker daemon on the process. This is clearly a security concern but considering that lazy on its own is meant to be run only locally and that all engines running on it are fully controlled by the user, this lessens the concerns.

To create helper containers (which we often do in our official engines), you can use [@lazyass/engine-helpers](https://github.com/SoftwareMarbles/lazy-engine-helpers) Node module.

## lazy.yaml

On start lazy loads engine configurations and runs them. The engine configuration is, by default, set in `lazy.yaml` file found in the lazy's root directory. Here's an example:

```yaml
version: 1
# id: default # optional lazy ID, useful when hacking
repository_auth: # optional, only needed if your engines are in a private Docker repository; alternatively use username, password_env and email_env to specify the names of environment variables in lazy's environment in which these values are kept, similar to `import_env`
    username_env: DOCKER_REPOSITORY_USERNAME_ENVVAR
    password_env: DOCKER_REPOSITORY_PASSWORD_ENVVAR
    email_env: DOCKER_REPOSITORY_EMAIL_ENVVAR
config:
    max_warnings_per_rule: 5 # optional value instructing lazy to replace too many per rule warnings with a single warning plus additional details
    max_warnings: 20 # optional value instructing lazy to never send more than this number of warnings, applied after max_warnings_per_rule
engines: # each of these engines can be left out and other custom or official engines may be added
    eslint:
        image: ierceg/lazy-eslint-engine:latest
        boot_wait: true # optional, defaults to true, flag instructing lazy to wait for engine's boot process to finish
        boot_timeout: 120 # optional timeout to wait for engine to boot
        meta: {} # optional metadata for the engine, if not provided lazy queries the engine for it
        env: # optional list of environment variables to set in engine's environment
            - MODE=strict # for example, not real
    stylelint:
        image: ierceg/lazy-stylelint-engine:latest
    tidy-html:
        image: ierceg/lazy-tidy-html-engine:latest
    github-access:
        image: ierceg/lazy-github-access-engine:latest
        import_env: # optional list of environment variables to import from lazy environment into engine environment
            - GITHUB_CLIENT_ID
            - GITHUB_CLIENT_SECRET
```

Note:

* `version` must be equal to `1`
* `id` is optional and if not provided it's set to `default`
* `repository_auth` can also be provided with tokens or by directly providing values in lazy.yaml (not recommended)
* `boot_timeout` is optional and its default is 30 seconds
* `import_env` clause is useful in avoiding specifying secret values like application client ID or secret in lazy.yaml

To allow easier hacking lazy can run engines mounted from local host filesystem. For example if we wanted to hack on `lazy-eslint-engine` we could specify it like this:

```yaml
version: 1
id: hacking
engines:
    eslint:
        image: ierceg/node-dev:6.9.1
        command: nodemon -V -d 1 -L -w node /app/index.js
        working_dir: /app
        volumes:
            - "/<your path to lazy-eslint-engine source code>:/app"
        labels:
            "io.lazyass.lazy.engine.languages": "JavaScript"
```

If you furthermore run lazy with `./lazy-dev` then both lazy and the engine above will be run under `nodemon` and restarted on their respective source code changes.

## Tests

At this moment most of our tests are of integration variety - we run a full lazy service and then send requests to it. You can run them with `make test`. Coverage is not great, to say the least so please feel free to jump in.

## Official engines

### Production

#### Linter engines

* [lazy-eslint-engine](https://github.com/getlazy/lazy-eslint-engine)
* [lazy-stylelint-engine](https://github.com/getlazy/lazy-stylelint-engine)
* [lazy-yaml-engine](https://github.com/getlazy/lazy-yaml-engine)
* [lazy-tidy-html-engine](https://github.com/getlazy/lazy-tidy-html-engine)

##### Work in progress

* [lazy-emcc-engine](https://github.com/getlazy/lazy-emcc-engine)
* [lazy-java-pmd-engine](https://github.com/getlazy/lazy-java-pmd-engine)

#### GitHub access engines

* [lazy-github-access-engine](https://github.com/getlazy/lazy-yaml-engine)
* [lazy-pullreq-engine](https://github.com/getlazy/lazy-pullreq-engine)

#### Additional engines

* [lazy-file-stats-engine](https://github.com/getlazy/lazy-file-stats-engine)

#### UI engine

* [lazy-dashboard](https://github.com/getlazy/lazy-dashboard-engine)

## License

MIT
