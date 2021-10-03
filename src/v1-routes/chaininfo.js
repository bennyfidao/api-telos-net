const moment = require('moment');
const { getCurrencyStats, getCurrencyBalance, getRexStats, getActionStats } = require("../libs/eosio-lib");

const cmcCirculationExclusions = ["exrsrv.tf", "tlosrecovery", "treasury.tcd", "works.decide", "tf", "eosio.saving", "free.tf", "eosio.names",
    "econdevfunds", "eosio.ram", "ramadmin.tf", "ramlaunch.tf", "treasury.tf", "accounts.tf", "grants.tf"];

const standardCirculationExclusions = ["exrsrv.tf", "tlosrecovery"];

async function circulatingSupply(requestor) {

    //let exclusions = requestor === 'cmc' ? cmcCirculationExclusions : standardCirculationExclusions;
    let exclusions = standardCirculationExclusions;

    const stats = await getCurrencyStats();
    var supply = parseFloat(stats.supply);
    if (isNaN(supply))
        throw new Error("Failed to get supply instead got stats with value of " + stats);

    console.log(`Supply is: ${supply.toFixed(4)}`)
    for (let i = 0; i < exclusions.length; i++) {
        let accountToCheck = exclusions[i];
        let balanceString = await getCurrencyBalance(accountToCheck);
        var bal = parseFloat(balanceString, 10);
        if (isNaN(bal))
            throw new Error("Failed to get balance for " + accountToCheck + " instead got " + bal);

        console.log(`${accountToCheck} has: ${bal.toFixed(4)}`)
        supply -= bal;
    }

    console.log('supply: ' + supply + ' was ' + stats.supply);
    return supply;
}

async function totalSupply() {
    const stats = await getCurrencyStats();
    return parseFloat(stats.supply, 10);
}

async function totalStaked(event, context) {
    const rex = await getRexStats();
    const stakeBalance = await getCurrencyBalance('eosio.stake');
    return parseFloat(rex.total_lendable) + parseFloat(stakeBalance);
}

async function rexApr() {
    const rex = await getRexStats();
    const totalLendable = parseFloat(rex.total_lendable);
    return ((12000000 / totalLendable) * 100).toFixed(2);
}

async function rexStaked() {
    const rex = await getRexStats();
    const totalLendable = parseFloat(rex.total_lendable);
    return totalLendable;
}

async function rexPrice() {
    const rex = await getRexStats();
    const totalLendable = parseFloat(rex.total_lendable);
    const totalRex = parseFloat(rex.total_rex);
    const rexTelosPrice = (totalLendable / totalRex);
    return rexTelosPrice;
}

async function blocktivityHourly() {
    let actionStats = await getActionStats(true, moment().startOf('hour'));
    return {
        last_1h_op: actionStats.action_count,
        last_1h_tx: actionStats.tx_count
    };
}

module.exports = async (fastify, options) => {
    fastify.get('stats/blocktivity', {
        schema: {
            tags: ['stats'],
            response: {
                200: {
                    type: 'object',
                    properties: {
                        last_1h_op: {
                            type: 'number',
                            example: 123456789
                        },
                        last_1h_tx: {
                            type: 'number',
                            example: 123456
                        }
                    }
                }
            }
        }
    }, async (request, reply) => {
        return await blocktivityHourly()
    })

    fastify.get('supply/staked', {
        schema: {
            tags: ['stats'],
            response: {
                200: {
                    example: 123456.7890,
                    type: 'number'
                }
            }
        }
    }, async (request, reply) => {
        return await totalStaked()
    })

    fastify.get('supply/circulating', {
        schema: {
            tags: ['stats'],
            querystring: {
                requestor: {
                    default: 'any',
                    type: 'string'
                }
            },
            response: {
                200: {
                    example: 123456.7890,
                    type: 'number'
                }
            }
        }
    }, async (request, reply) => {
        return await circulatingSupply(request.query.requestor)
    })

    fastify.get('supply/total', {
        schema: {
            tags: ['stats'],
            response: {
                200: {
                    example: 123456.7890,
                    type: 'number'
                }
            }
        }
    }, async (request, reply) => {
        return await totalSupply()
    })

    fastify.get('/rex/staked', {
        schema: {
            tags: ['stats'],
            response: {
                200: {
                    example: 123456.7890,
                    type: 'number'
                }
            }
        }
    }, async (request, reply) => {
        return await rexStaked()
    })

    fastify.get('/rex/apr', {
        schema: {
            tags: ['stats'],
            response: {
                200: {
                    example: 12.3,
                    type: 'number'
                }
            }
        }
    }, async (request, reply) => {
        return await rexApr()
    })

    fastify.get('/rex/price', {
        schema: {
            tags: ['stats'],
            response: {
                200: {
                    example: 0.0123456,
                    type: 'number'
                }
            }
        }
    }, async (request, reply) => {
        return await rexPrice()
    })
}