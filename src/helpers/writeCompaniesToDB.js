module.exports = (db, table, data, formatter) => {
  const count = 25;
  const requestsCount = Math.ceil(data.length / count);
  const result = [];
  for (let i = 0; i < requestsCount; i++) {
    const companiesGroup = data
      .slice(count * i, count * (i + 1))
      .map(formatter);
    result.push(companiesGroup);
    const params = {
      RequestItems: {
        [table]: companiesGroup,
      },
    };
    db.batchWriteItem(params, function (err, data) {
      if (err) {
        console.log("error", err);
      } else {
        console.log("Success", data);
      }
    });
  }
  return result.flat();
};
