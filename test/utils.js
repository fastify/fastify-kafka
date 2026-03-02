'use strict'

const crypto = require('node:crypto')
const { Admin } = require('@platformatic/kafka')

const BOOTSTRAP_BROKERS = ['127.0.0.1:9092']

module.exports.BOOTSTRAP_BROKERS = BOOTSTRAP_BROKERS

module.exports.getDefaultOptions = function getDefaultOptions () {
  return {
    producer: {
      bootstrapBrokers: BOOTSTRAP_BROKERS,
      clientId: 'fastify-kafka-test-producer',
      allowAutoTopicCreation: true
    },
    consumer: {
      bootstrapBrokers: BOOTSTRAP_BROKERS,
      clientId: 'fastify-kafka-test-consumer',
      maxWaitTime: 100,
      autocommit: false,
      allowAutoTopicCreation: true
    },
    consumerTopicConf: {}
  }
}

/**
 * Create topics via the Admin API.
 * Returns a function to delete them at the end of the test.
 */
module.exports.createTopics = async function createTopics (topics) {
  const admin = new Admin({
    bootstrapBrokers: BOOTSTRAP_BROKERS,
    clientId: 'fastify-kafka-test-admin'
  })

  try {
    await admin.createTopics({
      topics: Array.isArray(topics) ? topics : [topics],
      partitions: 1,
      replicas: 1
    })
    // Small delay to give Kafka time to propagate metadata
    await new Promise(resolve => setTimeout(resolve, 500))
  } catch (err) {
    if (!err.message || !err.message.includes('already exists')) throw err
  } finally {
    await admin.close()
  }

  return async function deleteTopics () {
    const a = new Admin({ bootstrapBrokers: BOOTSTRAP_BROKERS, clientId: 'fastify-kafka-test-admin-cleanup' })
    try {
      const toDelete = Array.isArray(topics) ? topics : [topics]
      await a.deleteTopics({ topics: toDelete })
    } catch (_) {}
    await a.close()
  }
}

module.exports.generateGroupId = function generateGroupId () {
  return crypto.randomBytes(20).toString('hex')
}

// Only for test purpose
module.exports.copyPlainObject = function copyPlainObject (obj) {
  return JSON.parse(JSON.stringify(obj))
}

module.exports.generateTopicName = function generateTopicName () {
  return crypto.randomBytes(5).toString('hex')
}

module.exports.withResolvers = Promise.withResolvers?.bind(Promise) || function () {
  let promiseResolve, promiseReject
  const promise = new Promise((resolve, reject) => {
    promiseResolve = resolve
    promiseReject = reject
  })
  return { promise, resolve: promiseResolve, reject: promiseReject }
}
