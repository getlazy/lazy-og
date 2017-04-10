# lazy-eslint
lazy package for eslint

## Development notes

* When running ESLint engine under `nodemon` (or similar) for purposes of debugging, you must have `/bin/bash -ic` as entry point to the container, otherwise engine won't receive correct `PATH` and thus won't be able to find yarn. You can specify it like this:

```
engines:
    eslint:
        image: ierceg/node-dev:6.9.5
        command:
            - /bin/bash
            - -ic
            - /app/nodemon-run.sh
        working_dir: /app
        volumes:
            - "/<your path to source>/lazy-eslint-engine:/app"
        ~include: eslint-rules.yaml
        import_env:
            - NPM_TOKEN
```

* After running ESLint engine with mounted volume, you will notice that your `package.json` and `yarn.lock` have been changed. This is due to yarn (that is run during configuration phase) insists on updating these files. Simply reset these changes with `git checkout package.json yarn.lock`.
