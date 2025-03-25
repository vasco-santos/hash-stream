/** @typedef {import('./types.js').AgentDataModel} AgentDataModel */

export class AgentData {
  /**
   * @param {import('./types.js').AgentDataModel} data
   */
  constructor(data) {
    this.data = data
  }

  /**
   * Instantiate AgentData from previously exported data.
   *
   * @param {import('./types.js').AgentDataModel} raw
   */
  static fromExport(raw) {
    return new AgentData(raw)
  }

  /**
   * Export data in a format safe to pass to `structuredClone()`.
   */
  export() {
    return this.data
  }
}
