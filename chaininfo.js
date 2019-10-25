import { getCurrencyStats, getCurrencyBalance } from "./libs/eosio-lib";
import { respond } from './libs/response-lib';

const cmcCirculationExclusions = ["exrsrv.tf", "tf", "eosio.saving", "free.tf", "eosio.names",
    "econdevfunds", "eosio.ram", "ramadmin.tf", "ramlaunch.tf", "treasury.tf", "accounts.tf", "grants.tf"];

const standardCirculationExclusions = ["exrsrv.tf"];

export async function circulatingSupply(event, context) {
    let exclusions = standardCirculationExclusions;
    if (event.queryStringParameters &&
        event.queryStringParameters.requestor &&
        event.queryStringParameters.requestor.toLowerCase() == "cmc") {
        exclusions = cmcCirculationExclusions;
    }

    const stats = await getCurrencyStats();
    var supply = parseFloat(stats.supply);
    if (isNaN(supply))
        throw new Error("Failed to get supply instead got stats with value of " + stats);

    for (let i = 0; i < exclusions.length; i++) {
        let accountToCheck = exclusions[i];
        let balanceString = await getCurrencyBalance(accountToCheck);
        var bal = parseFloat(balanceString, 10);
        if (isNaN(bal))
            throw new Error("Failed to get balance for " + accountToCheck + " instead got " + bal);

        supply -= bal;
    }

    console.log('supply: ' + supply + ' was ' + stats.supply);
    respond(200, supply);
}
