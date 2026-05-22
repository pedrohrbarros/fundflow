import { describe, it, expect } from 'bun:test'
import pino from 'pino'
import { Writable } from 'stream'
import { createDevStream } from '../../config/logging'

describe('Logging format', () => {
  it('dev stream formats info as {datetime} - INFO - {msg}', async () => {
    let captured = ''
    const test_output = new Writable({
      write(chunk, _encoding, callback) {
        captured += chunk.toString()
        callback()
      },
    })

    const test_logger = pino({ level: 'info' }, createDevStream(test_output))
    test_logger.info('test message')

    await new Promise((resolve) => setTimeout(resolve, 10))

    expect(captured).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} - INFO - test message\n$/)
  })

  it('dev stream formats error as {datetime} - ERROR - {msg} with data', async () => {
    let captured = ''
    const test_output = new Writable({
      write(chunk, _encoding, callback) {
        captured += chunk.toString()
        callback()
      },
    })

    const test_logger = pino({ level: 'error' }, createDevStream(test_output))
    test_logger.error({ error: 'something failed' }, 'Request error')

    await new Promise((resolve) => setTimeout(resolve, 10))

    expect(captured).toMatch(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} - ERROR - Request error/)
    expect(captured).toContain('something failed')
  })
})
