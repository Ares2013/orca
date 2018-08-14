# Orca changelog

For more context information, please read through the
[release notes](https://github.com/plotly/orca/releases).

To see all merged commits on the master branch that will be part of the next Orca release, go to:

https://github.com/plotly/orca/compare/vX.Y.Z...master

where X.Y.Z is the semver of most recent Orca release.


## [1.1.0] 2018-08-14

Orca is now a `conda` package [#113]:

```
conda install -c plotly plotly-orca
```

### Added
- Add `--graph-only` CLI option for `orca serve` to only boot the `plotly-graph`
  component, saving memory [#114]
- Add `table` plotly graph traces to `--safeMode` handler [#98]

### Changed
- Use `request@2.88.0`

### Fixed
- Hide electron icon from OS X dock [#103]


## [1.0.0] 2018-05-17

First Orca release :tada:

See installation instructions
[here](https://github.com/plotly/orca#installation). This release ships with
Orca CLI command `graph` (for plotly.js graph exports) and `serve` (which boots
up a server similar to Plotly's Image Server). Run `orca graph --help` and `orce
serve --help` for more info.
