# lazy-engine-pipeline-runner
Runs tasks through engine pipelines

### Metrics

On each run pipeline objects may emit multiple `metrics` events. Each such event emits an array of metric objects.

Each metric object consists of:

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `timestamp` | number | yes | Timestamp of the moment the metric was measured. |
| `category` | string | yes | The category of the metric, for example `file-analysis`. |
| `action` | string | yes | The action of the metric, for example `warning-ignored`. |
| `value` | number | no | Value of the metric. Unless specified it's assumed to be `1` as in single occurrence. |

There can be any number of other properties and all of them will be included in the stored metric as they are. Notice however that lazy **will** overwrite them if their property names match built-in properties (see below)

lazy will add the following built-in properties to each metric before storing it:

| Property | Type | Always | Description |
|----------|------|----------|-------------|
| `engineId` | string | yes | Name of the engine as specified in the lazy.yaml. |
| `language` | string | yes | The language for which the analysis was performed. |
| `hostPath` | string | yes | The path on the host of the file which was analyzed. |
| `client` | string | yes | The client (e.g. `atom`) which requested the analysis. |
| `hostname` | string | yes | The name of the host from which the analysis was invoked. |
| `repository` | string | no | The `origin` repository, if available, otherwise `upstream`, otherwise first remote repository. |
| `branch` | string | no | The current repository branch, if available. |

Other properties may be added in the future but `custom` property name is reserved for exclusive engine use and will never be overwritten by lazy. In it you can thus store deeper structures that need to be tracked.
