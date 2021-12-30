const verificationLib = require("../libs/verification-lib");

const verificationOpts = {
    schema: {
        tags: ['contracts'],
        body: {
            required: ['contractAddress','fileName','compilerVersion', 'contractCode'],
            type: 'object',
            properties: {
                contractAddress: {
                    description: 'address of deployed contract',
                    type: 'string',
                    example: '0xc4c89dD46524c6f704e92a9Cd012a3EbaDAdFF36'
                },
                fileName: {
                    description: 'name of .sol file',
                    type: 'string',
                    example: 'HelloWorld.sol'
                },
                compilerVersion: {
                    description: "compiler version. see https://github.com/ethereum/solc-bin/blob/gh-pages/bin/list.json",
                    type: 'string',
                    example: 'v0.4.23+commit.124ca40d'
                },
                contractCode: {
                    description: "Raw string containing contract code",
                    type: 'string',
                    example: `/** *Submitted for verification at Etherscan.io on 2018-04-21*/ pragma solidity ^0.4.0; contract HelloWorld {address public owner;modifier onlyOwner() { require(msg.sender == owner); _; }constructor() public {owner = msg.sender;}function salutaAndonio() public pure returns(bytes32 hw){hw = "HelloWorld";}function killMe() public onlyOwner {selfdestruct(owner);}}`
                },
                optimized: {
                    description: 'flag for optimization when compiling',
                    type: 'boolean',
                    example: false
                },
                runs: {
                    description: 'Optimization value for frequency',
                    type: 'number',
                    example: 200
                }
            }
        },
        response: {
            200: {
                description: '',
                type: 'null'
            },
            400: {
                description: 'request failed',
                type: 'string'
            }
        }
    }
}

async function verificationHandler(request, reply) {
    console.log("YAY WE MADE IT");

    const contractAddress = request.body.contractAddress;
    const fileName = request.body.fileName;
    const compilerVersion = request.body.compilerVersion;
    const contractCode = request.body.contractCode;

    if (!contractAddress ) {
        return reply.code(400).send("Must specify deployed contract address");
    }
    
    if (!fileName ) {
        return reply.code(400).send("Must specify file name e.g. 'myContract.sol'");
    }

    if (!compilerVersion ) {
        return reply.code(400).send("Must specify compiler version");
    }

    if (!contractCode ) {
        return reply.code(400).send("No contract code submitted");
    }

    const isContractAddress = await verificationLib.isContract(contractAddress);

    if (!isContractAddress) {
        return reply.code(400).send(`${contractAddress} is not a valid contract address`);
    }

    const verificationStatus = await verificationLib.verifyContract(request.body);
    const message = verificationStatus ? 'Contract verified' : 'Verification failed';
    reply.send(message);
}

module.exports = async (fastify, options) => {
    fastify.post('contracts/verify', verificationOpts, verificationHandler)
}