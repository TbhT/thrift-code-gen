# thrift-cli ⚡

---

> A tool to help developers use Thrift for __BFF__ (Backend for Frontend) development, reducing manual boilerplate code.

- 💡 Generates boilerplate code based on the Thrift IDL, including `ts-types`, `validator`, and `mock` code.


## Features

The `thrift-cli` scaffolding tool converts the Thrift IDL to corresponding TypeScript (TS) code. It currently generates the following types of code:

- **ts types**
  
  Converts the Thrift file to TypeScript types and request code for browser usage.
- **validator**
  
  Converts the Thrift file to request validation schemas defined in the `service`. Supported schema options include `Joi`, `Zod`, and `class-validator`.

- **mock**
  
  Generates TypeScript code that corresponds to the structure of the Thrift file.

- **controller (experimental)**

  The generated code needs to be used in the appropriate positions of the controller, such as validator schemas that need to be used at the entry point of requests and TypeScript types that need to be imported in requests and responses. 

  The mock data also needs to be imported in the returned interface or places required by the frontend. The controller provides configurations to import these generated code into the controller.


## IDL Config Options

### Core Configuration

This section includes configurations related to the input/output directories of the Thrift files and naming conventions.

```typescript
interface IdlOptions {
  /**
     * - Directory containing the `Thrift` files. Single file entry is not currently supported.
     - Supports both relative and absolute paths. Relative paths are relative to the current working directory, i.e., `process.cwd()`.
     *
     * Example:
     *
     * sourceDir: './thrift-idl'
     * sourceDir: '/var/tmp/thrift-idl'
     */
  sourceDir: string;

  /**
   * - Root directory for the generated code. Subdirectories will be created for different code scenarios.
   *
   * Example:
   *
   * outputDir: './files-gen'
   *
   * The final directory structure will be similar to the following (dependent on plugin configuration):
   *
   * ├── files-gens
   * │   ├── class-validator
   * │   │   └── pot-dto.ts
   * │   ├── joi-validator
   * │   │   └── pot-dto.ts
   * │   ├── mock
   * │   │   └── pot-dto.ts
   * │   ├── ts-types
   * │   │   └── pot-dto.ts
   * │   └── zod-validator
   * │       └── pot-dto.ts
   * ├── idl.config.json
   */
  outputDir: string;

  /**
   * Plugin configuration for generating TypeScript type code. See [TS Plugin Configuration] for details.
   */
  tsPluginOptions?: TSPluginOptions;

  /**
   * Plugin configuration for generating mock data code. See [Mock Plugin Configuration] for details.
   */
  mockOptions?: MockPluginOptions;

  /**
   * Plugin configuration for generating validator code. See [Validator Plugin Configuration] for details.
   */
  validatorOptions?: ValidatorPluginOptions;

  /**
   * Plugin configuration for generating Gulu2.0 controller template code. See [GuluController Plugin Configuration] for details.
   */
  guluControllerOptions?: GuluControllerOptions;
}
```

### TS Plugin Configuration

This section mainly covers the configuration of the plugin responsible for generating TypeScript type code:

```typescript
interface TSPluginOptions {
  /**
   *     Enable or disable the TS Plugin. It is enabled by default.
   */
  enable: boolean;

  /**
   *     Specify the type to which the Thrift i64 type should be converted. Currently, only global configuration is supported, and the default type is number.
   */
  i64As: 'number' | 'string' | 'bigint';

  /**
   * Default handling of thrift fields when the required/optional specifier is not explicitly specified.
   *
   * If optIn is set to true, it means that if a type is used in the `request` type of a `service` and it is not explicitly marked as required,
   * then it will be treated as `optional`. If optIn is set to false, it will be treated as `required`. optIn is set to true by default.
   *
   * If reqOut is set to true, it means that if a type is used in the `response` type of a `service` and it is not explicitly marked as required,
   * then it will be treated as `required`. If reqOut is set to false, it will be treated as `optional`. reqOut is set to true by default.
   *
   * If a type is referenced in both the request and response, including direct and shorthand references, the configuration in the request will take precedence.
   * This is because the referenced types in the request are resolved first before resolving the response types.
   *
   * Example
   *
   * The following is an example Thrift IDL definition:
   *
   *
   * struct Example {
   *  0: string field1
   *  1: i64    field2
   * }
   *
   * struct Req {
   *  0: required Example reqField1
   * }
   *
   * struct Res {
   *  0: optional Example resField1
   * }
   *
   * service S {
   *  Res fn1(0: required Req req)
   * }
   *
   * When using the default configuration for `requiredness`, the resulting TypeScript types will be as follows:
   *
   *
   *
   * export class S {
   *   fn1(req: Req) {
   *   }
   * }
   *
   * export interface Req {
   *   reqField1: Example;
   * }
   *
   * export interface Example {
   *   field1?: string;
   *   field2?: number;
   * }
   *
   * export interface Res {
   *   resField1?: Example;
   * }
   *
   *
   * Since the type `Example` is first used in the `Req` type, and the fields inside it are not explicitly marked as required,
   * the optIn default configuration is true, making them optional. Therefore, the fields in Example are optional.
   */
  requiredness: {
    optIn: boolean;
    reqOut: boolean;
  };

  /**
   * The output directory for the generated TypeScript type code files. If configured, it overrides the default output directory defined globally.
   * The default output directory is `${outputDir}/ts-types`.
   */
  outputDir?: string;
}
```


### Validator Plugin Configuration

This section mainly covers the configuration of the plugin responsible for generating validator schema code. Currently, there are three supported validation code generators:


- [Joi](https://joi.dev/)

- [Zod](https://zod.dev/)

- [class-validator](https://github.com/typestack/class-validator)

If the default generated validators do not meet your requirements, please refer to the documentation regarding Thrift annotations. Currently, the built-in annotations are mainly used to fulfill personalized needs.

Here are the explanations for the plugin-related configurations:

```typescript

interface ValidatorPluginOptions {
  /**
   * Enable or disable the validator plugin. It is enabled by default.
   */
  enable: boolean;

  /**
   * Specify the type to which the Thrift i64 type should be converted. Currently, only global configuration is supported, and the default type is number.
   */
  i64As: 'number' | 'string' | 'bigint';

  /**
   * The type of schema to generate. 'all' means that code for all three types will be generated by default.
   */
  schemaType: 'zod' | 'joi' | 'class-validator' | 'all';

  /**
   * Determines which types are parsed for generating validators. 'service' means only types used in services will be parsed, which is the default behavior.
   * '*' means all Thrift types will be parsed.
   */
  entry: 'service' | '*';

  /**
   * The output directory for the generated TypeScript type code files. If configured, it overrides the default output directory defined globally.
   * The default output directory is `${outputDir}/joi-validator`.
   */
  outputDir?: string;
}


```

### Mock Plugin Configuration

This plugin is primarily used to generate TypeScript mock data code based on fakerjs. Taking the following thrift IDL file as an example:

```thrift

struct Example {
  0: string field1
  1: i64    field2
}

struct Req {
  0: required Example reqField1
}

struct Res {
  0: optional Example resField1
}

service S {
  Res fn1(0: required Req req)
}

```

The resulting TypeScript code, which can be directly imported when using the corresponding type, will be as follows. More annotations will be added in the future:


```typescript
import { faker } from '@faker-js/faker';

export class Example {
  field1 = faker.datatype.string();
  field2 = faker.datatype.number();
}
```

The configuration options for the plugin are as follows:

```typescript
interface MockPluginOptions {
  /**
   * Whether to enable the mock plugin. It is enabled by default.
   */
  enable: boolean;

  /**
   * Specify the type to which the Thrift i64 type should be converted. Currently, only global configuration is supported, and the default type is number.
   */
  i64As: 'number' | 'string' | 'bigint';

  /**
   * The output directory for the generated TypeScript mock data code files. If configured, it overrides the default output directory defined globally.
   * The default output directory is `${outputDir}/mock`.
   */
  outputDir?: string;
}


```

### Example of Mock Annotations

The generation of mock code depends on fakerjs to generate mock data. Mock code is essentially a combination of the API provided by fakerjs with the corresponding structure in the IDL.



| annotation key | annotation value | meaning                                                                                   | example  |
|:--------------:|:-----------------|:------------------------------------------------------------------------------------------|----------|
| `mock` or `m`  | any string       | Indicates the mock code used for the current field. Currently, only fakerjs is supported. | see blow |


- Examples of mock-related IDL:


```thrift

typedef i64 Int64 (mock="typedef should not work")

typedef string Str (mock="faker.datatype.number()")

enum Foo {
  A = 1 (mock="enum should not work"),
  B = -2 (mock="enum should not work")
}

struct MockStructWithoutAnnotation {
  0: optional Int64 i64Field
  1: required Str strField
  2: list<string> strListField
  3: list<number> numListField
  4: list<map<string, string>> mapListField
  5: map<string, list<number>> listMapField
}

struct MockStructWithAnnotation {
  0: Int64 i64Field (mock="faker.datatype.number()")
  1: Str strField1 (mock="faker.datatype.string()")
  2: Str strField2 (mock="faker.lorem.paragraphs(5)")
  3: Str strField3 (mock="faker.image.abstract(640, 480, false)")
  4: list<map<string, string>> mapListField4 (mock="faker.address.countryCode('alpha-3')")
  5: map<string, list<number>> listMapField5 (mock="faker.datatype.number({ min: 10, max: 100, precision: 0.01 })")
}

```

- Example of generated mock code:


```typescript

import { faker } from "@faker-js/faker";

export class MockStructWithoutAnnotation {
    i64Field = faker.datatype.number();
    strField = faker.datatype.number();
    strListField = Array.from({ length: 30 }).map(() => (faker.datatype.string()));
    numListField = Array.from({ length: 30 }).map(() => (faker.datatype.number()));
    mapListField = Array.from({ length: 30 }).map(() => ({[faker.datatype.string()]:faker.datatype.string()}));
    listMapField = {[faker.datatype.string()]:Array.from({ length: 30 }).map(() => (faker.datatype.number()))};
}

export class MockStructWithAnnotation {
    i64Field = faker.datatype.number();
    strField1 = faker.datatype.string();
    strField2 = faker.lorem.paragraphs(5);
    strField3 = faker.image.abstract(640, 480, false);
    mapListField4 = Array.from({ length: 30 }).map(() => (faker.address.countryCode('alpha-3')));
    listMapField5 = {[faker.datatype.string()]:Array.from({ length: 30 }).map(() => (faker.datatype.number({ min: 10, max: 100, precision: 0.01 })))};
}


```
