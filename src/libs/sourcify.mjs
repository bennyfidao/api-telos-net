import axios from 'axios';
import { isVerified, uploadObject, SOURCE_FILENAME, METADATA_FILENAME } from './aws-s3-lib.js';
const CHAIN_ID = 40; 
const TESTNET_CHAIN_ID = 41;
const CONTRACTS_BUCKET = 'verified-evm-contracts';
const TESTNET_CONTRACTS_BUCKET = 'verfied-evm-contracts-testnet';

async function getVerifiedContracts(chainId){
  try{
    return await axios.get(
      `https://sourcify.dev/server/files/contracts/${chainId}`
      );
  }catch(e){
    console.log(e);
  }

}

async function getSource(contractAddress, chainId){
  try{
    return await axios.get(
      `https://sourcify.dev/server/files/${chainId}/${contractAddress}`
      );
  }catch(e){
    console.log(e);
  }
}

async function updateVerifiedContractsData(verifiedList,chainId, bucket){
  let newCount = 0;
  for (let address of verifiedList){
    if(isVerified(address)){ //check if already in bucket
      const source = await getSource(address, chainId);   
      const metadata = source.data.find(file => file.name === 'metadata.json');
      try{
        let buffer = new Buffer.from(JSON.stringify(metadata));
        await uploadObject(`${address}/${METADATA_FILENAME}`, buffer, bucket);
        buffer = new Buffer.from(JSON.stringify(source.data));
        await uploadObject(`${address}/${SOURCE_FILENAME}`, buffer, bucket);
        newCount++;
      }catch(e){
        console.log(e)
      }
    }
  }
  return newCount;
}

/**
 * run this file with node to get all contract verified addresses from sourcify 
 * and upload the new ones to s3 for querying
 */
(async function() { 
  let verifiedList = await getVerifiedContracts(CHAIN_ID);
  let updateCount = await updateVerifiedContractsData(verifiedList.data.full,CHAIN_ID, CONTRACTS_BUCKET);
  console.log(`Added ${updateCount} new verified contracts added on mainnet`)
  verifiedList = await getVerifiedContracts(TESTNET_CHAIN_ID);
  updateCount = await updateVerifiedContractsData(verifiedList.data.full,TESTNET_CHAIN_ID, TESTNET_CONTRACTS_BUCKET);
  console.log(`Added ${updateCount} new verified contracts added on testnet`)
})();