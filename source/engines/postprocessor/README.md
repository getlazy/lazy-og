# lazy-postproc-engine
Postprocessor for lazy engines pipeline

This is the engine that should be placed at the end of processing pipeline in the `lazy.yaml`.

The purpose of this engine is to:
- analyze the source code of a file looking for special directives
- modify the output of engines that are earlier in the pipeline

Lazy directives are defined as comments in the source code, and always start with `lazy` keyword. For example:

`// lazy ignore no-plusplus`

or,

`/* lazy ignore no-plusplus */`

or,

`# lazy ignore no-plusplus`

In HTML files, that don't support any of the above comment syntax, you can use:

`<!-- // lazy ignore no-plusplus -->`

The above `lazy ignore` directive will cause this engine to remove all warnings or erros produced by `no-plusplus` ESLint rule.

Following directives are currently supported:

* `lazy ignore <rule-id>` disables all occurences of `<rule-id>`
* `lazy ignore-once <rule-id>` disable only the first occurrence of `rule-id` after the directive
* `lazy ignore-all` if found anywhere in the file, this directive will remove all the warnings
* `lazy ignore-start` disable all warnings from this point to the first `lazy ignore-end` directive, or to the end of the file if no `lazy ignore-end` is found
* `lazy ignore-end` stop ignoring warnings from now on

## Configuration

Engine accepts the following configuration options:

* `woohoos` - array of strings that you want to be shown whenever after post-processing results there are no warnings left (e.g. `Well done!`, `No way!`, `Maximum effort.`)
* `ignore-always` - array of rule IDs that should always be ignored
