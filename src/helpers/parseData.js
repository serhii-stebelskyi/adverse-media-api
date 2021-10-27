const XLSX = require("xlsx");

module.exports.parseCompanies = (data) => {
  const fileData =
    typeof data === "string"
      ? XLSX.readFile(`${__dirname}/${data}.xlsx`)
      : XLSX.read(data);
  const sheets = fileData["Workbook"]["Sheets"].map((sheet) => sheet.name);
  const result = [];
  sheets.forEach((sheet) => {
    const sheetData = fileData["Sheets"][sheet];
    const sheetDataKeys = Object.keys(sheetData).filter(
      (e) => e !== "!ref" && e !== "!margins"
    );
    sheetDataKeys.forEach((key) => {
      const num = key.slice(1);
      const property = sheetData[key]?.["v"];
      if (key.includes("A") && +num > 1) {
        const company = {
          id: String(sheetData[`C${num}`]?.["v"]),
          title: property,
          lower_title: property.toLowerCase(),
          country: sheetData[`B${num}`]?.["v"],
          nace_code: sheetData[`D${num}`]?.["v"],
          activity_group_name: sheetData[`E${num}`]?.["v"],
          street: sheetData[`F${num}`]?.["v"],
          city: sheetData[`G${num}`]?.["v"],
          postcode: sheetData[`H${num}`]?.["v"],
          lang_address: sheetData[`I${num}`]?.["v"],
          holding_company: sheetData[`J${num}`]?.["v"],
          holdpostal_code: sheetData[`K${num}`]?.["v"],
          holdcountry_code: sheetData[`L${num}`]?.["v"],
          holdaddr_city: sheetData[`M${num}`]?.["v"],
          holdline_addr_1: sheetData[`N${num}`]?.["v"],
          company_main_siren_fra_id: sheetData[`O${num}`]?.["v"],
        };
        const alreadyExistCompany = result.find((e) => e.id === company.id);
        if (!alreadyExistCompany) {
          result.push(company);
        }
      }
    });
  });
  return result;
};
