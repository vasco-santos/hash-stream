import Conf from 'conf'

/**
 * @template T
 * @typedef {import('./types.js').ConfigDriver<T>} ConfigDriver
 */

/**
 * ConfDriver implementation with "[conf](https://github.com/sindresorhus/conf)"
 *
 * Usage:
 *
 * ```js
 * import { ConfDriver } from '@hash-stream/conf/driver'
 * ```
 *
 * @template {import('./types.js').AgentDataModel} T
 * @implements {ConfigDriver<T>}
 */
export class ConfDriver {
  /**
   * @type {Conf<T>}
   */
  #config

  /**
   * @param {{ profile: string }} opts
   */
  constructor(opts) {
    this.#config = new Conf({
      projectName: 'hash-stream',
      projectSuffix: '',
      configName: opts.profile,
      serialize: (v) => JSON.stringify(v),
      deserialize: (v) => JSON.parse(v),
    })
    this.path = this.#config.path
  }

  async open() {}

  async close() {}

  async reset() {
    this.#config.clear()
  }

  /** @param {T} data */
  async save(data) {
    if (typeof data === 'object') {
      data = { ...data }
      for (const [k, v] of Object.entries(data)) {
        if (v === undefined) {
          // @ts-ignore
          delete data[k]
        }
      }
    }
    this.#config.set(data)
  }

  /** @returns {Promise<T|undefined>} */
  async load() {
    const data = this.#config.store ?? {}
    if (Object.keys(data).length === 0) return
    return data
  }
}
