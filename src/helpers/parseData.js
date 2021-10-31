const XLSX = require('xlsx')

module.exports.parseCompanies = data => {
  const fileData =
    typeof data === 'string'
      ? XLSX.readFile(`${__dirname}/${data}.xlsx`)
      : XLSX.read(data)
  const sheets = fileData['Workbook']['Sheets'].map(sheet => sheet.name)
  const result = []
  sheets.forEach(sheet => {
    const sheetData = fileData['Sheets'][sheet]
    const sheetDataKeys = Object.keys(sheetData).filter(
      e => e !== '!ref' && e !== '!margins'
    )
    sheetDataKeys.forEach(key => {
      const num = key.slice(1)
      const property = sheetData[key]?.['v']
      if (key.includes('A') && +num > 1) {
        const company = {
          id: String(sheetData[`C${num}`]?.['v']),
          title: property,
          lower_title: property.toLowerCase(),
          country: sheetData[`B${num}`]?.['v'],
          nace_code: sheetData[`D${num}`]?.['v'],
          activity_group_name: sheetData[`E${num}`]?.['v'],
          street: sheetData[`F${num}`]?.['v'],
          city: sheetData[`G${num}`]?.['v'],
          postcode: sheetData[`H${num}`]?.['v'],
          lang_address: sheetData[`I${num}`]?.['v'],
          holding_company: sheetData[`J${num}`]?.['v'],
          holdpostal_code: sheetData[`K${num}`]?.['v'],
          holdcountry_code: sheetData[`L${num}`]?.['v'],
          holdaddr_city: sheetData[`M${num}`]?.['v'],
          holdline_addr_1: sheetData[`N${num}`]?.['v'],
          company_main_siren_fra_id: sheetData[`O${num}`]?.['v']
        }
        const alreadyExistCompany = result.find(e => e.id === company.id)
        if (!alreadyExistCompany) {
          result.push(company)
        }
      }
    })
  })
  return result
}

module.exports.parseData = data => {
  const fileData =
    typeof data === 'string' ? XLSX.readFile(data) : XLSX.read(data)
  const sheets = fileData['Workbook']['Sheets'].map(({ name }) => name)
  const tableLabels = {
    'AMPLYFI_NBR': 'id',
    'Company': 'title',
    'Country Name': 'country',
    'NACE Code': 'nace_code',
    'Activity group name': 'activity_group_name',
    'Street': 'street',
    'City': 'city',
    'Postcode': 'postcode',
    'Lang Address': 'lang_address',
    'HOLDING_COMPANY': 'holding_company',
    'HOLDPOSTAL_CODE': 'holdpostal_code',
    'HOLDCOUNTRY_CODE': 'holdcountry_code',
    'HOLDADDR_CITY': 'holdaddr_city',
    'HOLDLINE_ADDR_1': 'holdline_addr_1',
    'company_main.siren/ FRA ID': 'company_main_siren_fra_id',
    'Media URLs': 'media'
  }
  const result = []
  sheets.forEach(sheet => {
    const labelKeySymbols = {}
    const sheetDataKeys = Object.keys(fileData['Sheets'][sheet]).filter(
      key => key !== '!ref' && key !== '!margins'
    )

    let element = {}
    sheetDataKeys.forEach((key, keyIdx) => {
      const symbol = key[0]
      const keyNum = Number(key.slice(1))
      const el = fileData['Sheets'][sheet][key]
      const property = labelKeySymbols[symbol]
      const propertyValue = String(el['v'])
      const labelKeySymbolsProperties = Object.keys(labelKeySymbols)
      if (keyNum === 1) {
        labelKeySymbols[symbol] = tableLabels[propertyValue]
      } else {
        if (
          symbol === labelKeySymbolsProperties[0] &&
          keyIdx !== labelKeySymbolsProperties.length
        ) {
          result.push(element)
          element = {}
        }
        if (labelKeySymbols[symbol] === tableLabels['Media URLs']) {
          element[property] = element[property]
            ? [...element[property], propertyValue]
            : [propertyValue]
        } else {
          element[property] = propertyValue
        }
        if (keyIdx === sheetDataKeys.length - 1) {
          result.push(element)
        }
      }
    })
  })
  return result
}
