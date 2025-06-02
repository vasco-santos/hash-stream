# Changelog

## [1.4.2](https://github.com/vasco-santos/hash-stream/compare/index-v1.4.1...index-v1.4.2) (2025-06-02)


### Fixes

* index pipeline supports unixfs storing dag ([#125](https://github.com/vasco-santos/hash-stream/issues/125)) ([d91eabd](https://github.com/vasco-santos/hash-stream/commit/d91eabde093fbae3bd0098ba537d77210f2a9bbb))

## [1.4.1](https://github.com/vasco-santos/hash-stream/compare/index-v1.4.0...index-v1.4.1) (2025-05-19)


### Fixes

* index record and pack reader support path ([#108](https://github.com/vasco-santos/hash-stream/issues/108)) ([0003cc0](https://github.com/vasco-santos/hash-stream/commit/0003cc094f86fdda90043c0a2519b8860854af06))

## [1.4.0](https://github.com/vasco-santos/hash-stream/compare/index-v1.3.1...index-v1.4.0) (2025-04-21)


### Features

* add logo ([#92](https://github.com/vasco-santos/hash-stream/issues/92)) ([7692df5](https://github.com/vasco-santos/hash-stream/commit/7692df523d8b1814e92c60d94bf31bd811a33876))

## [1.3.1](https://github.com/vasco-santos/hash-stream/compare/index-v1.3.0...index-v1.3.1) (2025-04-17)


### Fixes

* index store keys with raw cid string ([#85](https://github.com/vasco-santos/hash-stream/issues/85)) ([7c9b7fe](https://github.com/vasco-santos/hash-stream/commit/7c9b7febcf8630a0bbd3adec2ba4c823517a2f4c))

## [1.3.0](https://github.com/vasco-santos/hash-stream/compare/index-v1.2.0...index-v1.3.0) (2025-04-15)


### Features

* guarantee integrity on cloud object storage ([#72](https://github.com/vasco-santos/hash-stream/issues/72)) ([50ad3d2](https://github.com/vasco-santos/hash-stream/commit/50ad3d2c341682ee8bc759bc78ee5c6456ee9aba))

## [1.2.0](https://github.com/vasco-santos/hash-stream/compare/index-v1.1.1...index-v1.2.0) (2025-04-11)


### Features

* add support for pack writer with multiple index writer ([#68](https://github.com/vasco-santos/hash-stream/issues/68)) ([26b7d80](https://github.com/vasco-santos/hash-stream/commit/26b7d80d64d3f6402096c191ed486d1b7431c892))

## [1.1.1](https://github.com/vasco-santos/hash-stream/compare/index-v1.1.0...index-v1.1.1) (2025-04-08)


### Fixes

* default empty prefix to empty string ([#50](https://github.com/vasco-santos/hash-stream/issues/50)) ([6caa3ce](https://github.com/vasco-santos/hash-stream/commit/6caa3cea54d99cedc4ef375b3cf726a8cfa72f9d))

## [1.1.0](https://github.com/vasco-santos/hash-stream/compare/index-v1.0.0...index-v1.1.0) (2025-04-07)


### Features

* cf worker bucket stores ([#45](https://github.com/vasco-santos/hash-stream/issues/45)) ([b3faa5d](https://github.com/vasco-santos/hash-stream/commit/b3faa5d6e7d5d8459bb7968b53fcfa5c8f5c48e6))

## 1.0.0 (2025-04-04)


### Features

* add s3 like stores ([#38](https://github.com/vasco-santos/hash-stream/issues/38)) ([1f7244f](https://github.com/vasco-santos/hash-stream/commit/1f7244f1947e3d7d2ceb6d9c3373a8f6d950f2e8))
* add to cli pack reader ([#31](https://github.com/vasco-santos/hash-stream/issues/31)) ([a9eb82e](https://github.com/vasco-santos/hash-stream/commit/a9eb82e4252f66b68eee1ffea519ee5d58640388))
* export test interface runners for third party implementors ([#40](https://github.com/vasco-santos/hash-stream/issues/40)) ([a7fedc9](https://github.com/vasco-santos/hash-stream/commit/a7fedc95446b8ff986df27d9c90cfbc56ee778f5))
* index package ([#7](https://github.com/vasco-santos/hash-stream/issues/7)) ([5ed02b5](https://github.com/vasco-santos/hash-stream/commit/5ed02b51b4225303031e69ed08c18586a986ed5f))
* index package base and eslint config ([#3](https://github.com/vasco-santos/hash-stream/issues/3)) ([7becbd3](https://github.com/vasco-santos/hash-stream/commit/7becbd3ad252d0d27f1ea68c2f4315a6fdd9837f))
* pack reader ([#25](https://github.com/vasco-santos/hash-stream/issues/25)) ([77f0d7e](https://github.com/vasco-santos/hash-stream/commit/77f0d7ed0045dad70ade06507f6dbb254b9c9f1f))


### Fixes

* index implementation according to spec revision ([#16](https://github.com/vasco-santos/hash-stream/issues/16)) ([e4d8c1c](https://github.com/vasco-santos/hash-stream/commit/e4d8c1c9fe52f4f2cecd1ddfcce8540fef6877f8))
* index split writer and reader classes ([#24](https://github.com/vasco-santos/hash-stream/issues/24)) ([1f53df1](https://github.com/vasco-santos/hash-stream/commit/1f53df1d16f2fe5e90828faddfeedc8ab08def6e))
* index store async iterator type ([#22](https://github.com/vasco-santos/hash-stream/issues/22)) ([c529172](https://github.com/vasco-santos/hash-stream/commit/c5291722555389516b8688495bbd4f5dd5824071))
* refactor index testing structure and stores  ([#39](https://github.com/vasco-santos/hash-stream/issues/39)) ([d17b667](https://github.com/vasco-santos/hash-stream/commit/d17b66783e9c54266c507b9fab0c9ec6bfd463d0))
* rename fs blob store and fix make blob store handle undefined on encode ([#17](https://github.com/vasco-santos/hash-stream/issues/17)) ([6bbd5bc](https://github.com/vasco-santos/hash-stream/commit/6bbd5bcc7dcdda4ea20252a1e2a4b5264565d52e))
* upgrade deps ([#27](https://github.com/vasco-santos/hash-stream/issues/27)) ([e23ccc4](https://github.com/vasco-santos/hash-stream/commit/e23ccc4599a9131aa7f07de87378a74e79423f25))


### Other Changes

* rename repo ([#5](https://github.com/vasco-santos/hash-stream/issues/5)) ([faf668e](https://github.com/vasco-santos/hash-stream/commit/faf668e1b7d7098d0af129b548e7893ca6c787e5))
