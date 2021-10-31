module.exports.scanElements = async (
  db,
  table,
  defaultParams,
  lastEvaluatedKey
) => {
  let result = []
  const params = {
    TableName: table,
    ...defaultParams
  }
  if (lastEvaluatedKey) {
    params['ExclusiveStartKey'] = lastEvaluatedKey
  }
  const promise = new Promise((resolve, reject) => {
    db.scan(params, async (err, data) => {
      if (err) {
        console.log(err)
        reject(err)
      } else {
        const lastEvaluatedKey = data.LastEvaluatedKey
        result = [...result, ...data.Items]
        if (lastEvaluatedKey) {
          const data = await this.scanElements(
            db,
            table,
            defaultParams,
            lastEvaluatedKey
          )
          result = [...result, ...data]
          resolve()
        } else {
          resolve()
        }
      }
    })
  })
  await promise
  return result
}
