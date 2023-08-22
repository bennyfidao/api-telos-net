const { getKeyBySecretName } = require("./auth-lib");
const { createPrivateKey, randomUUID } = require('crypto');
const { promisify } = require('util');
const jsonwebtoken = require('jsonwebtoken');

// Note: must have aws cli configured locally to execute.
// Change below values for sandbox testing:
//   payload.sub: 'e46b1cb7-9fb5-4e1d-985b-fca1b4e6f217'
//   aws secret key name: 'topper-widget-key'
//   options.keyid: '87c793b4-8ba5-4dba-a17d-8e49144d8766'


// Promisify the `jsonwebtoken.sign()` method for simplicity.
const sign = promisify(jsonwebtoken.sign);

function getPayload(address){
  // Create the payload for the bootstrap token, note that the
  // `jsonwebtoken.sign()` method automatically adds the `iat` claim.
  const payload = {
    jti: randomUUID(),
    sub: '13ebd307-7d82-4f67-aee1-f20202bc7651',
    source: {
      amount: '100.00',
      asset: 'USD'
    },
    target: {
      address,
      asset: 'TLOS',
      network: 'ethereum',
      label: 'Ethereum Mainnet Address',
      recipientEditMode: "only-address-and-tag"
    }
  };

  return payload;
}

async function fetchPrivateKey(){
  // fetch private key from AWS, required to generate bootstrap token
  const topperWidgetKey = await getKeyBySecretName('topper-widget-key-production');

  // Load private key in JWK format from an AWS secret.
  const privateKeyJwk = JSON.parse(topperWidgetKey);

  // Parse the JWK formatted key.
  const privateKey = createPrivateKey({ format: 'jwk', key: privateKeyJwk });

  return privateKey;
}

// Create the options the `jsonwebtoken.sign()` method.
const options = {
  algorithm: 'ES256',
  keyid: 'a393c622-339e-4b3b-bd59-3a18ef4d9f2c' 

};


async function getBootstrapToken(ethAddress) {
  const payload = getPayload(ethAddress);
  const privateKey = await fetchPrivateKey();
  const bootstrapToken = await sign(payload, privateKey, options);

  return bootstrapToken;
}

module.exports = { getBootstrapToken };