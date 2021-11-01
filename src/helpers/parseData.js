const XLSX = require("xlsx");

module.exports.parseCompanies = (data) => {
  const fileData =
    typeof data === "string" ? XLSX.readFile(data) : XLSX.read(data);
  const sheets = fileData["Workbook"]["Sheets"].map(({ name }) => name);
  const tableLabels = {
    AMPLYFI_NBR: "id",
    Company: "title",
    "Country Name": "country",
    "NACE Code": "nace_code",
    "Activity group name": "activity_group_name",
    Street: "street",
    City: "city",
    Postcode: "postcode",
    "Lang Address": "lang_address",
    HOLDING_COMPANY: "holding_company",
    HOLDPOSTAL_CODE: "holdpostal_code",
    HOLDCOUNTRY_CODE: "holdcountry_code",
    HOLDADDR_CITY: "holdaddr_city",
    HOLDLINE_ADDR_1: "holdline_addr_1",
    "company_main.siren/ FRA ID": "company_main_siren_fra_id",
    "Media URLs": "media",
  };
  const result = [];
  sheets.forEach((sheet) => {
    const labelKeySymbols = {};
    const sheetDataKeys = Object.keys(fileData["Sheets"][sheet]).filter(
      (key) => key !== "!ref" && key !== "!margins"
    );

    let element = {};
    sheetDataKeys.forEach((key, keyIdx) => {
      const symbol = key[0];
      const keyNum = Number(key.slice(1));
      const el = fileData["Sheets"][sheet][key];
      const property = labelKeySymbols[symbol];
      const propertyValue = String(el["v"]);
      const labelKeySymbolsProperties = Object.keys(labelKeySymbols);
      if (keyNum === 1) {
        labelKeySymbols[symbol] = tableLabels[propertyValue];
      } else {
        if (
          symbol === labelKeySymbolsProperties[0] &&
          keyIdx !== labelKeySymbolsProperties.length
        ) {
          result.push(element);
          element = {};
        }
        if (labelKeySymbols[symbol] === tableLabels["Media URLs"]) {
          element[property] = element[property]
            ? [...element[property], propertyValue]
            : [propertyValue];
        } else {
          element[property] = propertyValue;
        }
        if (keyIdx === sheetDataKeys.length - 1) {
          result.push(element);
        }
      }
    });
  });
  return result.map((e) => ({ ...e, lower_title: e.title.toLowerCase() }));
};
