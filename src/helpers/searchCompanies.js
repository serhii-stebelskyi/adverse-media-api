const axios = require('../axios')

module.exports = async companies => {
  const count = 599
  const companyGroupsCount = Math.ceil(companies.length / count)
  const timeout = 60000
  const result = []
  for (let i = 0; i < companyGroupsCount; i++) {
    const companiesGroup = companies.slice(i * count, (i + 1) * count)
    setTimeout(
      async () => {
        const promises = companiesGroup.map(company => {
          const { title, id } = company
          return axios
            .post('/searches', { search_term: title, fuzziness: 0.4 })
            .then(function (res) {
              const formattedCompanies = res.data.content.data.hits.map(
                (company, key) => {
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
                }
              )
              return formattedCompanies
            })
        })
        const data = (await Promise.all(promises)).flat()
        result.push(data)
      },
      i > 0 ? timeout * i : i
    )
  }
  return result
}
