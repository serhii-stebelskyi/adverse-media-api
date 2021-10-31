module.exports.searchCompaniesData = async (event, context, callback) => {
  const AWS = require('aws-sdk')
  const axios = require('axios').default
  require('dotenv').config()
  AWS.config.update({
    region: 'us-east-2',
    secretAccessKey: '5GZ+LcS51yMd3lcoub7H0R2MQ0OJ0tWj1AmCse2g',
    accessKeyId: 'AKIASYW5CWAX6KJMI66W'
  })
  const dynamodb = new AWS.DynamoDB()

  const formatPutRequestToCompanyLookup = request => {
    return {
      id: request.id ? request.id.S : '',
      title: request.title ? request.title.S : '',
      country: request.country ? request.country.S : '',
      city: request.city ? request.city.S : '',
      street: request.street ? request.street.S : '',
      holdaddr_city: request.holdaddr_city ? request.holdaddr_city.S : '',
      nace_code: (request.nace_code ? request.nace_code.S : '') || '',
      activity_group_name: request.activity_group_name
        ? request.activity_group_name.S
        : '',
      lang_address: (request.lang_address ? request.lang_address.S : '') || '',
      holdcountry_code: request.holdcountry_code
        ? request.holdcountry_code.S
        : '',
      company_main_siren_fra_id: request.company_main_siren_fra_id
        ? request.company_main_siren_fra_id.S
        : '',
      postcode: request.postcode ? request.postcode.S : '',
      holdline_addr_1: request.holdline_addr_1 ? request.holdline_addr_1.S : '',
      holding_company: request.holding_company ? request.holding_company.S : '',
      holdpostal_code: request.holdpostal_code ? request.holdpostal_code.S : ''
    }
  }
  const formatCompany = company => {
    return {
      PutRequest: {
        Item: {
          id: {
            S: String(company.id)
          },
          title: {
            S: company.title
          },
          media: {
            L: company.media
              ? company.media.map(media => ({
                  M: {
                    title: {
                      S: media.title
                    },
                    url: {
                      S: media.url
                    }
                  }
                }))
              : []
          },
          original_id: {
            S: company.original_id
          }
        }
      }
    }
  }
  const writeCompaniesToDB = (db, table, data, formatter) => {
    const count = 25
    const requestsCount = Math.ceil(data.length / count)
    const result = []
    for (let i = 0; i < requestsCount; i++) {
      const companiesGroup = data
        .slice(count * i, count * (i + 1))
        .map(formatter)
      result.push(companiesGroup)
      const params = {
        RequestItems: {
          [table]: companiesGroup
        }
      }
      db.batchWriteItem(params, function (err, data) {
        if (err) {
          console.log('error', err)
        } else {
          console.log('Success', data)
        }
      })
    }
    return result.flat()
  }

  const scanParams = {
    TableName: 'companies-lookup',
    Select: 'ALL_ATTRIBUTES'
  }

  const entities = ['company', 'organisation']
  dynamodb.scan(scanParams, async function (err, data) {
    if (err) {
      console.error(
        'Unable to read item. Error JSON:',
        JSON.stringify(err, null, 2)
      )
    } else {
      const companies = data['Items'].map(formatPutRequestToCompanyLookup)
      const limitCount = 399
      const companyGroupsCount = Math.ceil(companies.length / limitCount) * 2
      const timeout = 80000
      for (let i = 0; i < companyGroupsCount; i++) {
        const originalIdx = i % 2 === 0
        const companiesGroup = companies.slice(
          (i > 0 ? Math.floor(i / 2) : i) * limitCount,
          (i > 0 ? Math.floor(i / 2) + 1 : i + 1) * limitCount
        )
        const entity = originalIdx ? entities[0] : entities[1]
        setTimeout(
          async () => {
            companiesGroup.forEach((company, idx) => {
              const { title, id } = company
              axios
                .post(
                  `https://api.complyadvantage.com/searches?entity_type=${entity}`,
                  {
                    search_term: title,
                    fuzziness: 0.4
                  },
                  {
                    headers: {
                      Authorization: `Token ${process.env.COMPLY_API_KEY}`
                    }
                  }
                )
                .then(function (res) {
                  const formattedCompanies = res.data.content.data.hits
                    .filter(e => entities.includes(e.doc.entity_type))
                    .map(company => {
                      const formattedCompany = {
                        id: company.doc.id,
                        title: company.doc ? company.doc.name || '' : '',
                        media:
                          Boolean(company.doc) && Boolean(company.doc.media)
                            ? company.doc.media.map(media => ({
                                title: media.title,
                                url: media.url
                              }))
                            : [],
                        original_id: id
                      }
                      return formattedCompany
                    })
                  writeCompaniesToDB(
                    dynamodb,
                    'companies',
                    formattedCompanies,
                    formatCompany
                  )
                })
                .catch(err => {
                  console.log(err)
                })
            })
          },
          i > 0 ? timeout * i : i
        )
      }
    }
  })
  callback(null, '')
}
