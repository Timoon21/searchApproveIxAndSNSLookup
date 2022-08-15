import { Connection, PublicKey } from "@solana/web3.js";
import { getHandleAndRegistryKey, performReverseLookup, getAllDomains} from "@bonfida/spl-name-service";
const RPC_URL = 'https://ssc-dao.genesysgo.net/';
const connection = new Connection(RPC_URL, 'confirmed');


async function searchSNS(pubkey){
  let domainPubkeys
  let domainsName = []
    try{
      domainPubkeys = await getAllDomains(connection, pubkey);
      for (const domainPubkey of domainPubkeys){
        const domainName = await performReverseLookup(connection, domainPubkey);
        domainsName.push(domainName)
      }
  } catch(e){console.log(e)}
  return domainsName
}

const DATA = [
 {
   "PUBKEY": ""
 }
];


(async () => {
  for (const wallet of DATA){
    const sns = await searchSNS(new PublicKey(wallet.PUBKEY))
    console.log(wallet.PUBKEY,sns )
  }
})();
