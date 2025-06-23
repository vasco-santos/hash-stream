/* global Buffer */

import http from 'http'
import { once } from 'events'

export function createInMemoryHTTPServer() {
  const store = new Map() // pathname -> Uint8Array

  const server = http.createServer(async (req, res) => {
    if (!req.url) {
      res.writeHead(400, { 'Content-Type': 'text/plain' })
      return res.end('Bad Request: URL is null')
    }

    const url = new URL(req.url, `http://${req.headers.host}`)
    const key = url.pathname

    if (req.method === 'GET') {
      const buf = store.get(key)
      if (!buf) {
        res.writeHead(404)
        return res.end()
      }

      const range = req.headers.range
      if (range) {
        const [startStr, endStr] = range.replace(/bytes=/, '').split('-')
        const start = parseInt(startStr, 10)
        const end = endStr ? parseInt(endStr, 10) : buf.length - 1

        res.writeHead(206, {
          'Content-Range': `bytes ${start}-${end}/${buf.length}`,
          'Content-Length': end - start + 1,
          'Content-Type': 'application/octet-stream',
        })
        return res.end(buf.slice(start, end + 1))
      }

      res.writeHead(200, {
        'Content-Length': buf.length,
        'Content-Type': 'application/octet-stream',
      })
      return res.end(buf)
    }

    if (req.method === 'PUT') {
      const chunks = []
      for await (const chunk of req) {
        chunks.push(chunk)
      }
      const data = Buffer.concat(chunks)
      store.set(key, data)
      res.writeHead(200)
      return res.end()
    }

    res.writeHead(405)
    res.end()
  })

  return {
    start: async () => {
      server.listen(0)
      await once(server, 'listening')
      // @ts-expect-error no port in types
      const { port } = server.address()
      return {
        server,
        baseURL: new URL(`http://localhost:${port}/`),
        store,
      }
    },
    stop: async () => {
      server.close()
      await once(server, 'close')
    },
  }
}
