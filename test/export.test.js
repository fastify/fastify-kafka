'use strict'

const { test } = require('tap')
const fastifyKafka = require('..')
const defaultExport = require('..').default
const { fastifyKafka: namedExport } = require('..')

test('export', function (t) {
  t.plan(3)

  t.test('module export', function (t) {
    t.plan(1)
    t.equal(typeof fastifyKafka, 'function')
  })

  t.test('default export', function (t) {
    t.plan(1)
    t.equal(typeof defaultExport, 'function')
  })

  t.test('named export', function (t) {
    t.plan(1)
    t.equal(typeof namedExport, 'function')
  })
})
