@olierjs/thrift-cli
=================

generate typescript code from thrift files


[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/@olierjs/thrift-cli.svg)](https://npmjs.org/package/@olierjs/thrift-cli)
[![Downloads/week](https://img.shields.io/npm/dw/@olierjs/thrift-cli.svg)](https://npmjs.org/package/@olierjs/thrift-cli)

 
<!-- toc -->
* [Usage](#usage)
* [Commands](#commands)
<!-- tocstop -->
# Usage
<!-- usage -->
```sh-session
$ npm install -g @olierjs/thrift-cli
$ thrift-cli COMMAND
running command...
$ thrift-cli (--version)
@olierjs/thrift-cli/0.0.0 darwin-arm64 node-v18.19.0
$ thrift-cli --help [COMMAND]
USAGE
  $ thrift-cli COMMAND
...
```
<!-- usagestop -->
# Commands
<!-- commands -->
- [@olierjs/thrift-cli](#tbhtthrift-cli)
- [Usage](#usage)
- [Commands](#commands)
  - [`thrift-cli hello PERSON`](#thrift-cli-hello-person)
  - [`thrift-cli hello world`](#thrift-cli-hello-world)
  - [`thrift-cli help [COMMAND]`](#thrift-cli-help-command)
  - [`thrift-cli plugins`](#thrift-cli-plugins)
  - [`thrift-cli plugins add PLUGIN`](#thrift-cli-plugins-add-plugin)
  - [`thrift-cli plugins:inspect PLUGIN...`](#thrift-cli-pluginsinspect-plugin)
  - [`thrift-cli plugins install PLUGIN`](#thrift-cli-plugins-install-plugin)
  - [`thrift-cli plugins link PATH`](#thrift-cli-plugins-link-path)
  - [`thrift-cli plugins remove [PLUGIN]`](#thrift-cli-plugins-remove-plugin)
  - [`thrift-cli plugins reset`](#thrift-cli-plugins-reset)
  - [`thrift-cli plugins uninstall [PLUGIN]`](#thrift-cli-plugins-uninstall-plugin)
  - [`thrift-cli plugins unlink [PLUGIN]`](#thrift-cli-plugins-unlink-plugin)
  - [`thrift-cli plugins update`](#thrift-cli-plugins-update)

## `thrift-cli hello PERSON`

Say hello

```
USAGE
  $ thrift-cli hello PERSON -f <value>

ARGUMENTS
  PERSON  Person to say hello to

FLAGS
  -f, --from=<value>  (required) Who is saying hello

DESCRIPTION
  Say hello

EXAMPLES
  $ thrift-cli hello friend --from oclif
  hello friend from oclif! (./src/commands/hello/index.ts)
```

_See code: [src/commands/hello/index.ts](https://github.com/TbhT/thrift-code-gen/blob/v0.0.0/src/commands/hello/index.ts)_

## `thrift-cli hello world`

Say hello world

```
USAGE
  $ thrift-cli hello world

DESCRIPTION
  Say hello world

EXAMPLES
  $ thrift-cli hello world
  hello world! (./src/commands/hello/world.ts)
```

_See code: [src/commands/hello/world.ts](https://github.com/TbhT/thrift-code-gen/blob/v0.0.0/src/commands/hello/world.ts)_

## `thrift-cli help [COMMAND]`

Display help for thrift-cli.

```
USAGE
  $ thrift-cli help [COMMAND...] [-n]

ARGUMENTS
  COMMAND...  Command to show help for.

FLAGS
  -n, --nested-commands  Include all nested commands in the output.

DESCRIPTION
  Display help for thrift-cli.
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v6.2.3/src/commands/help.ts)_

## `thrift-cli plugins`

List installed plugins.

```
USAGE
  $ thrift-cli plugins [--json] [--core]

FLAGS
  --core  Show core plugins.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  List installed plugins.

EXAMPLES
  $ thrift-cli plugins
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.3.2/src/commands/plugins/index.ts)_

## `thrift-cli plugins add PLUGIN`

Installs a plugin into thrift-cli.

```
USAGE
  $ thrift-cli plugins add PLUGIN... [--json] [-f] [-h] [-s | -v]

ARGUMENTS
  PLUGIN...  Plugin to install.

FLAGS
  -f, --force    Force npm to fetch remote resources even if a local copy exists on disk.
  -h, --help     Show CLI help.
  -s, --silent   Silences npm output.
  -v, --verbose  Show verbose npm output.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Installs a plugin into thrift-cli.

  Uses npm to install plugins.

  Installation of a user-installed plugin will override a core plugin.

  Use the THRIFT_CLI_NPM_LOG_LEVEL environment variable to set the npm loglevel.
  Use the THRIFT_CLI_NPM_REGISTRY environment variable to set the npm registry.

ALIASES
  $ thrift-cli plugins add

EXAMPLES
  Install a plugin from npm registry.

    $ thrift-cli plugins add myplugin

  Install a plugin from a github url.

    $ thrift-cli plugins add https://github.com/someuser/someplugin

  Install a plugin from a github slug.

    $ thrift-cli plugins add someuser/someplugin
```

## `thrift-cli plugins:inspect PLUGIN...`

Displays installation properties of a plugin.

```
USAGE
  $ thrift-cli plugins inspect PLUGIN...

ARGUMENTS
  PLUGIN...  [default: .] Plugin to inspect.

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Displays installation properties of a plugin.

EXAMPLES
  $ thrift-cli plugins inspect myplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.3.2/src/commands/plugins/inspect.ts)_

## `thrift-cli plugins install PLUGIN`

Installs a plugin into thrift-cli.

```
USAGE
  $ thrift-cli plugins install PLUGIN... [--json] [-f] [-h] [-s | -v]

ARGUMENTS
  PLUGIN...  Plugin to install.

FLAGS
  -f, --force    Force npm to fetch remote resources even if a local copy exists on disk.
  -h, --help     Show CLI help.
  -s, --silent   Silences npm output.
  -v, --verbose  Show verbose npm output.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Installs a plugin into thrift-cli.

  Uses npm to install plugins.

  Installation of a user-installed plugin will override a core plugin.

  Use the THRIFT_CLI_NPM_LOG_LEVEL environment variable to set the npm loglevel.
  Use the THRIFT_CLI_NPM_REGISTRY environment variable to set the npm registry.

ALIASES
  $ thrift-cli plugins add

EXAMPLES
  Install a plugin from npm registry.

    $ thrift-cli plugins install myplugin

  Install a plugin from a github url.

    $ thrift-cli plugins install https://github.com/someuser/someplugin

  Install a plugin from a github slug.

    $ thrift-cli plugins install someuser/someplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.3.2/src/commands/plugins/install.ts)_

## `thrift-cli plugins link PATH`

Links a plugin into the CLI for development.

```
USAGE
  $ thrift-cli plugins link PATH [-h] [--install] [-v]

ARGUMENTS
  PATH  [default: .] path to plugin

FLAGS
  -h, --help          Show CLI help.
  -v, --verbose
      --[no-]install  Install dependencies after linking the plugin.

DESCRIPTION
  Links a plugin into the CLI for development.
  Installation of a linked plugin will override a user-installed or core plugin.

  e.g. If you have a user-installed or core plugin that has a 'hello' command, installing a linked plugin with a 'hello'
  command will override the user-installed or core plugin implementation. This is useful for development work.


EXAMPLES
  $ thrift-cli plugins link myplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.3.2/src/commands/plugins/link.ts)_

## `thrift-cli plugins remove [PLUGIN]`

Removes a plugin from the CLI.

```
USAGE
  $ thrift-cli plugins remove [PLUGIN...] [-h] [-v]

ARGUMENTS
  PLUGIN...  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ thrift-cli plugins unlink
  $ thrift-cli plugins remove

EXAMPLES
  $ thrift-cli plugins remove myplugin
```

## `thrift-cli plugins reset`

Remove all user-installed and linked plugins.

```
USAGE
  $ thrift-cli plugins reset [--hard] [--reinstall]

FLAGS
  --hard       Delete node_modules and package manager related files in addition to uninstalling plugins.
  --reinstall  Reinstall all plugins after uninstalling.
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.3.2/src/commands/plugins/reset.ts)_

## `thrift-cli plugins uninstall [PLUGIN]`

Removes a plugin from the CLI.

```
USAGE
  $ thrift-cli plugins uninstall [PLUGIN...] [-h] [-v]

ARGUMENTS
  PLUGIN...  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ thrift-cli plugins unlink
  $ thrift-cli plugins remove

EXAMPLES
  $ thrift-cli plugins uninstall myplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.3.2/src/commands/plugins/uninstall.ts)_

## `thrift-cli plugins unlink [PLUGIN]`

Removes a plugin from the CLI.

```
USAGE
  $ thrift-cli plugins unlink [PLUGIN...] [-h] [-v]

ARGUMENTS
  PLUGIN...  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ thrift-cli plugins unlink
  $ thrift-cli plugins remove

EXAMPLES
  $ thrift-cli plugins unlink myplugin
```

## `thrift-cli plugins update`

Update installed plugins.

```
USAGE
  $ thrift-cli plugins update [-h] [-v]

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Update installed plugins.
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.3.2/src/commands/plugins/update.ts)_
<!-- commandsstop -->
