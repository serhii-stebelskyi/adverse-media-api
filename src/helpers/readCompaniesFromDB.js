module.exports = async (db, table, data, formatter, resFormatter) => {
  const count = 100;
  const requestsCount = Math.ceil(data.length / count);
  const arr = new Array(requestsCount).fill(null).map((_, index) => index);
  if (!arr.length) {
    return { notFoundData: [], findedData: [] };
  }
  for (const i of arr) {
    const companiesGroup = data.slice(count * i, count * (i + 1));
    const params = formatter(table, companiesGroup);
    const result = await new Promise((resolve, reject) => {
      db.batchGetItem(params, function (err, res) {
        if (err) {
          console.log("error", err);
          reject(err);
        } else {
          const data = res.Responses[table];
          const findedIds = data.map((e) => e.id.S);
          const findedData = resFormatter ? data.map(resFormatter) : data;
          const notFoundData = companiesGroup.filter(
            (e) => !findedIds.includes(e.id)
          );
          resolve({ notFoundData, findedData });
        }
      });
    });
    return result;
  }
};
