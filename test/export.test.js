'use strict'

const { test } = require('node:test')
const fastifyKafka = require('..')
const defaultExport = require('..').default
const { fastifyKafka: namedExport } = require('..')

test('export', async function (t) {
  t.plan(3)

  await t.test('module export', function (t) {
    t.plan(1)
    t.assert.deepStrictEqual(typeof fastifyKafka, 'function')
  })

  await t.test('default export', function (t) {
    t.plan(1)
    t.assert.deepStrictEqual(typeof defaultExport, 'function')
  })

  await t.test('named export', function (t) {
    t.plan(1)
    t.assert.deepStrictEqual(typeof namedExport, 'function')
  })
})
