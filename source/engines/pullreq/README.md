# lazy-pullreq-engine
Linter for GitHub pull requests.

Add this to `lazy.yaml` as usual, and configure it to be used for all languages.

This module requires:
* `github-access-engine` to be installed and configured
* `github-access-engine` HAS to be named `github-access` in `lazy.yaml` (because this module needs to get the GH tokens from the sandbox)
* Before using this linter, users have to login to GitHub via `github-access-engine` (to get OAuth tokens).

