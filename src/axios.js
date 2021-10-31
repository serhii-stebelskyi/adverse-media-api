const axios = require('axios').default
require('dotenv').config()

const accessToken = process.env.COMPLY_API_KEY
const instance = axios.create({
  baseURL: 'https://api.complyadvantage.com',
  headers: {
    Authorization: `Token ${accessToken}`
  }
})

module.exports = instance
