module.exports = async (db, table, data, formatter) => {
  const count = 100;
  const requestsCount = Math.ceil(data.length / count);
  const arr = new Array(requestsCount).fill(null).map((_, index) => index);
  for (const i of arr) {
    const companiesGroup = data.slice(count * i, count * (i + 1));
    const params = formatter(table, companiesGroup);
    const result = await new Promise((resolve, reject) => {
      db.batchGetItem(params, function (err, res) {
        if (err) {
          console.log("error", err);
          reject(err);
        } else {
          const findedIds = res.Responses[table].map((e) => e.id.S);
          const notFoundData = companiesGroup.filter(
            (e) => !findedIds.includes(e.id)
          );
          resolve(notFoundData);
        }
      });
    });
    return result;
  }
};
