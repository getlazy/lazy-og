# lazy-github-access-engine

lazy engine allowing lazy to access user's GitHub data. This is achieved by offering OAuth2 authentication endpoints which are then

## Authentication endpoints

This engine provides four endpoints:

* `/auth/start` - Endpoint on which we start the authentication process from the browser.
* `/auth/callback` - Endpoint invoked by GitHub at the end of the authentication process.
* `/auth/success` - Endpoint to which engine redirects the browser on successful authentication.
* `/auth/failure` - Endpoint to which engine redirects the browser on failed authentication.

Only the `/auth/start` endpoint is invoked directly when you want to authenticate yourself with GitHub.

## Authentication store

Results of successful authentications are stored in the engine's sandbox directory as defined by lazy. They are stored within a JSON file **without any encryption** as such encryption would be pointless (you have direct access to storage, you have access to source code, you control GitHub ID/secret *and* lazy is not meant to be used in a multi-tenant fashion anyway). The name of the JSON file is `logins.json`.

## Configuration

This engine requires the following additional environment variables:

* `GITHUB_CLIENT_ID`: client ID for your GitHub application
* `GITHUB_CLIENT_SECRET`: client secret for your GitHub application

Set these variables through `lazy.yaml`:

```yaml
github-access:
    image: getlazy/github-access-engine:latest
    env:
        - GITHUB_CLIENT_ID=<client ID>
        - GITHUB_CLIENT_SECRET=<client secret>
```

You can create a GitHub application in your GitHub account (Settings->OAuth applications). When defining your callback endpoint set the value to `https://<lazy-server>:<lazy-port>/engine/<github-access-engine-name>/auth/callback`. For example, assuming that your lazy server is at lazy.my.org, mapped to port 80 and in your `lazy.yaml` you have named the engine `github-access` (like above) then the callback URL would be `https://lazy.my.org/engine/github-access/auth/start`.
