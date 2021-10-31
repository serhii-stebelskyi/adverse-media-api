const writeCompaniesToDB = require('./writeCompaniesToDB')
const { parseCompanies, parseData } = require('./parseData')
const {
  formatCompanyLookup,
  formatPutRequestToCompany,
  formatCompaniesToGetRequest,
  formatPutRequestToCompanyMedia
} = require('./format')
const readCompaniesFromDB = require('./readCompaniesFromDB')
const { scanElements } = require('./scanElements')

module.exports.writeCompaniesToDB = writeCompaniesToDB
module.exports.parseCompanies = parseCompanies
module.exports.parseData = parseData
module.exports.formatCompanyLookup = formatCompanyLookup
module.exports.formatPutRequestToCompany = formatPutRequestToCompany
module.exports.formatCompaniesToGetRequest = formatCompaniesToGetRequest
module.exports.formatPutRequestToCompanyMedia = formatPutRequestToCompanyMedia
module.exports.readCompaniesFromDB = readCompaniesFromDB
module.exports.scanElements = scanElements
