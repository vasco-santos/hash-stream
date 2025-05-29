---
editUrl: false
next: true
prev: true
title: "scheduleStoreFilesForIndexing"
---

> **scheduleStoreFilesForIndexing**(`fileStore`, `indexScheduler`, `options`): `AsyncIterable`\<`string`, `any`, `any`\>

Defined in: [index.js:23](https://github.com/vasco-santos/hash-stream/blob/main/packages/index-pipeline/src/index.js#L23)

Function that prepares files for indexing by listing them in the file store
and sending a reference of each file to an Index scheduler.
This function is useful for setting up a schedule-based indexing processor where files
need to be processed asynchronously. It can be a Queue, a message broker, or even a
simple HTTP endpoint that accepts file references for processing.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `fileStore` | `FileStore` |
| `indexScheduler` | `IndexScheduler` |
| `options` | `ScheduleStoreFilesOptions` |

## Returns

`AsyncIterable`\<`string`, `any`, `any`\>
