const COMPANIES = 'companies'
const COMPANIES_LOOKUP = 'companies-lookup'
const USERS = 'users'

module.exports.companiesSchema = {
  TableName: COMPANIES,
  KeySchema: [{ AttributeName: 'id', KeyType: 'HASH' }],
  AttributeDefinitions: [{ AttributeName: 'id', AttributeType: 'S' }],
  ProvisionedThroughput: {
    ReadCapacityUnits: 10,
    WriteCapacityUnits: 10
  }
}

module.exports.companiesLookupSchema = {
  TableName: COMPANIES_LOOKUP,
  KeySchema: [{ AttributeName: 'id', KeyType: 'HASH' }],
  AttributeDefinitions: [{ AttributeName: 'id', AttributeType: 'S' }],
  ProvisionedThroughput: {
    ReadCapacityUnits: 10,
    WriteCapacityUnits: 10
  }
}

module.exports.usersSchema = {
  TableName: USERS,
  KeySchema: [{ AttributeName: 'email', KeyType: 'HASH' }],
  AttributeDefinitions: [{ AttributeName: 'email', AttributeType: 'S' }],
  ProvisionedThroughput: {
    ReadCapacityUnits: 10,
    WriteCapacityUnits: 10
  }
}
