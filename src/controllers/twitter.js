// const logger = require('../utils/logger')
const Twit = require('twit')

class TwitterController {
  static post (description, callback) {
    const t = new Twit({
      consumer_key: process.env.TWITTER_API_CONSUMER_KEY,
      consumer_secret: process.env.TWITTER_API_CONSUMER_SECRET,
      access_token: process.env.TWITTER_API_ACCESS_TOKEN,
      access_token_secret: process.env.TWITTER_API_ACCESS_TOKEN_SECRET,
      timeout_ms: 60 * 1000
    })

    t.post('statuses/update', { status: description }, function (err, data, response) {
      if (err) {
        callback(err)
      } else {
        callback(null)
      }
    })
  }
}

module.exports = TwitterController
