'use strict'

const crypto = require('crypto')

module.exports.getDefaultOptions = function getDefaultOptions () {
  return {
    producer: {
      'metadata.broker.list': '127.0.0.1:9092',
      'allow.auto.create.topics': true,
      dr_cb: true
    },
    consumer: {
      'metadata.broker.list': '127.0.0.1:9092',
      'fetch.wait.max.ms': 10,
      'fetch.error.backoff.ms': 50,
      'topic.metadata.refresh.interval.ms': 100,
      'allow.auto.create.topics': true
    },
    consumerTopicConf: {
      'auto.offset.reset': 'beginning'
    },
    metadataOptions: {
      timeout: 2000
    }
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
