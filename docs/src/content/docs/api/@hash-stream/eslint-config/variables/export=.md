---
editUrl: false
next: true
prev: true
title: "export="
---

> **export=**: `object`

Defined in: [index.js:3](https://github.com/vasco-santos/hash-stream/blob/main/packages/eslint-config/index.js#L3)

## Type declaration

### extends

> **extends**: `string`[]

### parserOptions

> **parserOptions**: `object`

#### parserOptions.EXPERIMENTAL\_useProjectService

> **parserOptions.EXPERIMENTAL\_useProjectService**: `boolean` = `true`

### rules

> **rules**: `object`

#### rules.@typescript-eslint/ban-ts-comment

> **rules.@typescript-eslint/ban-ts-comment**: `string` = `'off'`

#### rules.@typescript-eslint/no-unused-vars

> **rules.@typescript-eslint/no-unused-vars**: `string` = `'off'`

#### rules.jsdoc/check-tag-names

> **rules.jsdoc/check-tag-names**: `string` = `'off'`

#### rules.jsdoc/check-values

> **rules.jsdoc/check-values**: `string` = `'off'`

many of these rules are inherited from hd-scripts.
It may be useful over time to remove these rules
and juse use plugin:jsdoc/recommended defaults.
But that might require updating src.

#### rules.jsdoc/no-undefined-types

> **rules.jsdoc/no-undefined-types**: (`string` \| \{ `definedTypes`: `string`[]; \})[]

#### rules.jsdoc/require-jsdoc

> **rules.jsdoc/require-jsdoc**: (`string` \| \{ `publicOnly`: `boolean`; \})[]

#### rules.jsdoc/require-param-description

> **rules.jsdoc/require-param-description**: `string` = `'off'`

#### rules.jsdoc/require-property-description

> **rules.jsdoc/require-property-description**: `string` = `'off'`

#### rules.jsdoc/require-returns

> **rules.jsdoc/require-returns**: `string` = `'off'`

#### rules.jsdoc/require-returns-description

> **rules.jsdoc/require-returns-description**: `string` = `'off'`

#### rules.jsdoc/require-returns-type

> **rules.jsdoc/require-returns-type**: `string` = `'off'`

#### rules.jsdoc/require-throws

> **rules.jsdoc/require-throws**: `string` = `'off'`

#### rules.jsdoc/require-yields

> **rules.jsdoc/require-yields**: `string` = `'off'`

#### rules.jsdoc/tag-lines

> **rules.jsdoc/tag-lines**: (`string` \| \{ `startLines`: `number`; \})[]

#### rules.jsdoc/valid-types

> **rules.jsdoc/valid-types**: `string` = `'off'`
