const algosdk = require("algosdk");
const helper = require("./contract_helper");

// const { transaction } = require('algosdk.future');

async function callEverything() {
  try {
    const mnemonic = "exit clap write shield video mistake oblige police flush feature snake category wisdom because boring spring early rally turtle banana modify habit approve able rotate"
    const address = "IODQCCDAR55ACZSW744KRFMTXSOQYLE4W572AJTQSNWX4A5RWXO4SAITXA"

    const mnemonic =
      "cement soda parrot ridge pull produce vacuum climb life blanket prosper scout country orange legal mention tooth raise private ride potato hub powder above isolate";
    const address =
      "CCSYN4ZTBJNBNWZ4NHUHY6NFFG3P54VV6ZOQ7SVGAQNCUXDMN52NU4WMZ4";
    let creatorPrivateKey = helper.getPrrivatekeyFromMnemonic(mnemonic).sk;
    console.log("creatorPrivateKey ", creatorPrivateKey);

    const algodToken =
      "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
    const algodServer = "http://localhost";
    const algodPort = 4001;

    let algodClient = new algosdk.Algodv2(algodToken, algodServer, algodPort);

    let accountInfo = await algodClient.accountInformation(address).do();
    accountInfo.sk = creatorPrivateKey;
    if (accountInfo.amount < algosdk.ALGORAND_MIN_TX_FEE) {
      console.log("Please add funds before proceeding...... ", accountInfo);
    }

    let localInts = 2;
    let localBytes = 2;
    let globalInts = 3;
    let globalBytes = 3;

    let appArgs = [];

    const appId = await helper.createApp(algodClient, accountInfo, localInts, localBytes, globalInts, globalBytes, appArgs);

    const optInTxn = await helper.optInTxn(algodClient, accountInfo, appId);
   
    var appArgs1 = [];
    appArgs1.push(new Uint8Array(Buffer.from("withdraw")));
    appArgs1.push(bytesArray(100000));
    console.log("appArgs1: ", appArgs1);
    const callApp = await helper.callApp(algodClient, accountInfo, appArgs1, appId);

    var appArgs2 = [];
    appArgs2.push(new Uint8Array(Buffer.from("repay")));
    console.log("repay: ", appArgs2)
    const callAppWithPayment = await helper.callAppWithPayment(algodClient, mnemonic, appId,appArgs2, 1000000);

    await helper.readGlobalState(algodClient, accountInfo, appId);
    await helper.readLocalState(algodClient, accountInfo, appId);

   
  } catch (err) {
    console.log("err", err);
  }
  process.exit();
}

callEverything();

const bytesArray = (n) => {
    if (!n) return new ArrayBuffer(0)
    const a = []
    a.unshift(n & 255)
    while (n >= 256) {
      n = n >>> 8
      a.unshift(n & 255)
    }
    return new Uint8Array(a)
  }