const AWS = require("aws-sdk");
AWS.config.update({ region: "us-east-1" });

function call(action, params) {
  const dynamoDb = new AWS.DynamoDB.DocumentClient();
  return dynamoDb[action](params).promise();
}

async function save(record) {
  record.updatedAt = Date.now();

  await call("put", {
    TableName: process.env.tableName,
    Item: record
  });
}

async function deleteAccount(smsHash) {
  const delParams = {
    TableName: process.env.tableName,
    Key: {
      smsHash: smsHash
    }
  };

  await call("delete", delParams);
}

async function ipCanCreate(ipAddress) {
  const readParams = {
    TableName: process.env.recaptchaTableName,
    Key: {
      ipAddress
    }
  }

  const result = await call("get", readParams);

  if(result.Item) {
    min = 1000*60
    difference = ((Date.now() - result.Item.firstCreate)/min)
    difference = difference ? difference : 0
  }

  if (!result.Item || !result.Item.firstCreate || result.Item.accountsCreated < result.Item.accountsAllowed || difference > process.env.TIME_SPAN) {
    return true;
  }

  return false;
}

async function ipCreated(ipAddress) {
  const readParams = {
    TableName: process.env.recaptchaTableName,
    Key: {
      ipAddress
    }
  }

  const lastCreate = Date.now();
  const firstCreate = lastCreate;
  const accountsCreated = 1;
  const accountsAllowed = 4;

  const result = await call("get", readParams);

  difference = 0;
  if(result.Item){
    min = 1000*60
    difference = ((Date.now() - result.Item.firstCreate)/min)
    difference = difference ? difference : 0 // Get time since first create in minutes
  }
  
  if (!result.Item) { // If user has never created an account through this service
    const createResult = await call("put", {
      TableName: process.env.recaptchaTableName,
      Item: {
        ipAddress, accountsCreated, accountsAllowed, lastCreate, firstCreate
      },
      ConditionExpression: 'attribute_not_exists(ipAddress)'
    })
    
  } else if(!result.Item.firstCreate){ // If a user has not created an account since we added support for creating 4 accounts/week
    const updateResult = await call("update", {
      TableName: process.env.recaptchaTableName,
      Key: {
        ipAddress
      },
      UpdateExpression: "set accountsCreated = :num, accountsAllowed = :accountsAllowed, lastCreate = :lastCreate, firstCreate = :firstCreate",
      ExpressionAttributeValues: {
        ":accountsAllowed": accountsAllowed,
        ":num": 1,
        ":lastCreate": lastCreate,
        ":firstCreate": firstCreate
      }
    })
  } else if(difference > process.env.TIME_SPAN) { // If it has been at least 7 days since their first account this set
    const updateResult = await call("update", {
      TableName: process.env.recaptchaTableName,
      Key: {
        ipAddress
      },
      UpdateExpression: "set accountsCreated = accountsCreated + :num, accountsAllowed = accountsCreated + :accountsAllowed, lastCreate = :lastCreate, firstCreate = :lastCreate",
      ExpressionAttributeValues: {
        ":num": 1,
        ":lastCreate": lastCreate,
        ":accountsAllowed": accountsAllowed
      }
    })
  } else {
    const updateResult = await call("update", {
      TableName: process.env.recaptchaTableName,
      Key: {
        ipAddress
      },
      UpdateExpression: "set accountsCreated = accountsCreated + :num, lastCreate = :lastCreate",
      ConditionExpression: "accountsCreated < accountsAllowed",
      ExpressionAttributeValues: {
        ":num": 1,
        ":lastCreate": lastCreate
      }
    })


  }
}

async function exists(smsHash) {
  const readParams = {
    TableName: process.env.tableName,
    Key: {
      smsHash: smsHash
    }
  };

  const result = await call("get", readParams);
  if (!result.Item) {
    return false;
  }

  return true;
}

async function getBySmsHash(smsHash) {
  const readParams = {
    TableName: process.env.tableName,
    Key: {
      smsHash: smsHash
    }
  };

  const result = await call("get", readParams);
  if (!result.Item) {
    throw new Error(`SMS Hash ${smsHash} not found`);
  }

  return result.Item;
}

module.exports = { call, save, deleteAccount, exists, getBySmsHash, ipCanCreate, ipCreated }