import { Connection, PublicKey } from "@solana/web3.js";
import fetch from 'node-fetch';
import { getHandleAndRegistryKey} from "@bonfida/spl-name-service";

// Log to File
import { Console } from "console";
import fs from "fs";
const myLogger = new Console({
  stdout: fs.createWriteStream(`log.csv`),
});

async function sleep(n) { return new Promise(resolve=>setTimeout(resolve,n)); }

let lastTx = ''
const untilTx = ''
const ADRESS_TO_SCAN = 'DrBYESnnfEqqnfJu7Mv5NHsY3VrooNSxuDxkb9WSmvZS'; // DrachmaExchange Rug Program
//const ADRESS_TO_SCAN = '31ARfyxZg6fr1J9hVs1NqBWkdeYeCKipuY71bMovNpy9'; // SolFire Rug Program
const RPC_URL = 'https://ssc-dao.genesysgo.net/';
const ELT_NB = 1000;
const connection = new Connection(RPC_URL, 'confirmed');

interface txParam {
  limit?: number;
  before?: string;
  until?: string;
}

const setTxParam = (before) => {
  let param: txParam = {
  limit: 1000
  };
  if (before){param.before = before}
  if (untilTx){param.until = untilTx}
  return param
}

async function getTx(before) {
    const response = await fetch(RPC_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        "jsonrpc": "2.0",
        "id": 1,
        "method": "getSignaturesForAddress",
        "params": [
          ADRESS_TO_SCAN,
          setTxParam(before)
        ]
      }),
    });
    const result = await response.json()
    return result.result
}

async function logResult(pubkey, txDate, txSigner, txSig){
  let twHandle
  try{
    [twHandle] = await getHandleAndRegistryKey(connection, pubkey);
  } catch(e){twHandle = ''}

  myLogger.log(`${txDate};${txSigner};${txSig};${twHandle}`)
  console.log(txDate, "- Signer:", txSigner,"- Tx:", txSig, twHandle)
}

async function searchApproveAndReturnLastTx(txs){
  let txSig,txParsed
  for (const tx of txs){
    let approveFlag = false
    txSig = tx.signature
    txParsed = await connection.getParsedTransaction(txSig)

    const txSigner = txParsed.transaction.message.accountKeys[0].pubkey.toString()
    const pubkey = new PublicKey(txSigner);
    const txDate = new Date(txParsed.blockTime*1000).toISOString().
                                              replace(/T/, ' ').
                                              replace(/\..+/, '')

    await Promise.all(txParsed.transaction.message.instructions.map(async (ix) => {
      try{
        const type = ix.parsed.type
        if (type == "approve"){
          if (!txParsed.meta.err) {
            approveFlag = true
          }
        }
        process.stdout.write(`${txSig} \r`)
      } catch (e) {}
    }));

    await Promise.all(txParsed.meta.innerInstructions.map(async (iixs) => {
      await Promise.all(iixs.instructions.map(async (iix) => {
        try{
          const type = iix.parsed.type
          if (type == "approve"){
            if (!txParsed.meta.err) {
              approveFlag = true
            }
          }
        }catch(e){};
      }));
      process.stdout.write(`${txSig} \r`)
    }));

    if (approveFlag){
        await logResult(pubkey,txDate,txSigner,txSig)
    } 
  }
  return txSig
}

(async () => {
  myLogger.log("Date; Signer; Tx; TwitterHandle")
  let txs = Array.from(Array(ELT_NB).keys())

  while (txs.length >= ELT_NB){
    txs = await getTx(lastTx);
    lastTx = await searchApproveAndReturnLastTx(txs);
  }
})();
