const algosdk = require("algosdk");
const utils = require("./utils");

exports.createAccount = function () {
  try {
    const myaccount = algosdk.generateAccount();
    console.log("Account Address = " + myaccount.addr);
    let account_mnemonic = algosdk.secretKeyToMnemonic(myaccount.sk);
    console.log("Account Mnemonic = " + account_mnemonic);
    console.log("Account secretKey", myaccount.sk);
    console.log("Account created. Save off Mnemonic and address");
    console.log("Add funds to account using the TestNet Dispenser: ");
    console.log("https://dispenser.testnet.aws.algodev.network/ ");
    return myaccount;
  } catch (err) {
    console.log("err", err);
  }
};

exports.getPrrivatekeyFromMnemonic = (mnemonic) => {
  return algosdk.mnemonicToSecretKey(mnemonic);
};

exports.getMnemonicFromPrrivatekey = (mnemonic) => {
  return algosdk.secretKeyToMnemonic(mnemonic);
};

/**
 * Wait for confirmation — timeout after 2 rounds
 */
async function verboseWaitForConfirmation(client, txnId) {
  console.log("Awaiting confirmation (this will take several seconds)...");
  const roundTimeout = 2;
  const completedTx = await utils.waitForConfirmation(
    client,
    txnId,
    roundTimeout
  );
  console.log("Transaction successful.");
  return completedTx;
}

/**
 * Log a bolded message to console
 */
function logBold(message) {
  console.log(`${utils.fmt.bold}${message}${utils.fmt.reset}`);
}

async function getBasicProgramBytes(client) {
  const program = "#pragma version 2\nint 1";

  // use algod to compile the program
  const compiledProgram = await client.compile(program).do();
  return new Uint8Array(Buffer.from(compiledProgram.result, "base64"));
}

exports.createApp = async function (
  client,
  accountInfo,
  numLocalInts,
  numLocalByteSlices,
  numGlobalInts,
  numGlobalByteSlices,
  appArgs
) {
  const onComplete = algosdk.OnApplicationComplete.NoOpOC;
  const approvalProgram = await getBasicProgramBytes(client);
  const clearProgram = await getBasicProgramBytes(client);

  const suggestedParams = await client.getTransactionParams().do();

  const createTxn = algosdk.makeApplicationCreateTxn(
    accountInfo.address,
    suggestedParams,
    onComplete,
    approvalProgram,
    clearProgram,
    numLocalInts,
    numLocalByteSlices,
    numGlobalInts,
    numGlobalByteSlices,
    appArgs
  );

  logBold("Sending application creation transaction.");
  const signedCreateTxn = createTxn.signTxn(accountInfo.sk);
  const { txId: createTxId } = await client
    .sendRawTransaction(signedCreateTxn)
    .do();

  // wait for confirmation
  const completedTx = await verboseWaitForConfirmation(client, createTxId);
  const appId = completedTx["application-index"];
  console.log("appId: ", appId);
  return appId;
};

// ------------------------------
// > Opt in to application
// ------------------------------

// opt in to the created application
exports.optInTxn = async function (client, accountInfo, appId) {
  let suggestedParams = await client.getTransactionParams().do();
  // comment out the next two (2) lines to use suggested fees
  suggestedParams.flatFee = true;
  suggestedParams.fee = algosdk.ALGORAND_MIN_TX_FEE;

  const optInTxn = algosdk.makeApplicationOptInTxn(
    accountInfo.address,
    suggestedParams,
    appId
  );

  // send the transaction
  logBold("Sending application opt in transaction.");
  const signedOptInTxn = optInTxn.signTxn(accountInfo.sk);
  const { txId: optInTxId } = await client
    .sendRawTransaction(signedOptInTxn)
    .do();

  // wait for confirmation
  const optInTxnResp = await verboseWaitForConfirmation(client, optInTxId);
  console.log("optInTxnResp: ", optInTxnResp);
};

// ------------------------------
// > Call application
// ------------------------------

// call the created application
exports.callApp = async function (client, accountInfo, appArgs, appId) {
  console.log("Calling ", appArgs[0], " method with args: ", appArgs[1]);
  let suggestedParams = await client.getTransactionParams().do();
  suggestedParams.flatFee = true;
  suggestedParams.fee = algosdk.ALGORAND_MIN_TX_FEE;

  const callTxn = algosdk.makeApplicationNoOpTxn(
    accountInfo.address,
    suggestedParams,
    appId,
    appArgs
  );

  // send the transaction
  logBold("Sending application call transaction.");
  const signedCallTxn = callTxn.signTxn(accountInfo.sk);
  const { txId: callTxnId } = await client
    .sendRawTransaction(signedCallTxn)
    .do();

  // wait for confirmation
  const callApp = await verboseWaitForConfirmation(client, callTxnId);
  console.log("callApp: ", callApp);
};

// ------------------------------
// > Call application with payment
// ------------------------------

// Call application with payment
exports.callAppWithPayment = async function (
  client,
  mnemonic,
  appId,
  appArgs,
  amount
) {
  console.log("Calling", appArgs, " method with payment", amount);

  const appAddr = algosdk.getApplicationAddress(appId);
  const sender = algosdk.mnemonicToSecretKey(mnemonic);

  console.log("appAddr: ", appAddr);
  console.log("sender: ", sender);

  const suggestedParams = await client.getTransactionParams().do();
  suggestedParams.flatFee = true;
  suggestedParams.fee = algosdk.ALGORAND_MIN_TX_FEE;

  let txn1 = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    from: sender.addr,
    to: appAddr,
    amount,
    suggestedParams,
  });
  let txn2 = algosdk.makeApplicationNoOpTxn(
    sender.addr,
    suggestedParams,
    appId,
    appArgs
  );
  algosdk.assignGroupID([txn1, txn2]);
  const stxn1 = txn1.signTxn(sender.sk);
  const stxn2 = txn2.signTxn(sender.sk);
  console.log("Sending transactions...");
  const { txId } = await client.sendRawTransaction([stxn1, stxn2]).do();

  // wait for confirmation – timeout after 2 rounds
  console.log("Awaiting confirmation (this will take several seconds)...");
  const roundTimeout = 2;
  const callAppWithPayment = await utils.waitForConfirmation(
    client,
    txId,
    roundTimeout
  );
  console.log("callAppWithPayment: ", callAppWithPayment);
  console.log("Transactions successful.");
};

exports.readLocalState = async function (algodClient, accountInfo, appId) {
  let account = await algodClient.accountInformation(accountInfo.address).do();
  for (const i in account["apps-local-state"]) {
    const app = account["apps-local-state"][i];
    if (app.id == appId) {
      console.log("readLocalState : ", formatState(app["key-value"]));
      return app["key-value"];
    }
  }
};

exports.readGlobalState = async function (algodClient, accountInfo, appId) {
  let account = await algodClient.accountInformation(accountInfo.address).do();
  for (const i in account["created-apps"]) {
    const app = account["created-apps"][i];
    console.log(app.id);
    if (app.id == appId) {
      console.log(
        "readGlobalState : ",
        formatState(app["params"]["global-state"])
      );
      return app["params"]["global-state"];
    }
  }
};

function formatState(state) {
  let formatted = {};
  for (const i in state) {
    const item = state[i];
    const key = item["key"];
    const value = item["value"];
    const formattedKey = Buffer.from(key, "base64");
    let formattedValue;
    if (value["type"] == 1) {
      if (formattedKey == "voted") {
        formattedValue = Buffer.from(value["bytes"], "base64");
      } else formattedValue = value["bytes"];
      formatted[formattedKey] = formattedValue;
    } else {
      formatted[formattedKey] = value["uint"];
    }
  }
  return formatted;
}

// ------------------------------
// > Close out application
// ------------------------------

// Close out (opt account out) from the application
// const closeOutTxn = function () {
//     const closeOutTxn = algosdk.makeApplicationCloseOutTxn(
//         receiver.addr,
//         suggestedParams,
//         appId,
//         appArgs
//     );

//     // send the transaction
//     logBold('Sending application close out transaction.');
//     const signedCloseOutTxn = closeOutTxn.signTxn(receiver.sk);
//     const { txId: closeOutTxnId } = await client
//         .sendRawTransaction(signedCloseOutTxn)
//         .do();

//     // wait for confirmation
//     await verboseWaitForConfirmation(client, closeOutTxnId);
// }

// // ------------------------------
// // > Delete application
// // ------------------------------

// // delete the application
// const deleteTxn = function () {
//     const closeOutTxn = algosdk.makeApplicationCloseOutTxn(
//         receiver.addr,
//         suggestedParams,
//         appId,
//         appArgs
//     );

//     // send the transaction
//     logBold('Sending application close out transaction.');
//     const signedCloseOutTxn = closeOutTxn.signTxn(receiver.sk);
//     const { txId: closeOutTxnId } = await client
//         .sendRawTransaction(signedCloseOutTxn)
//         .do();

//     // wait for confirmation
//     await verboseWaitForConfirmation(client, closeOutTxnId);
// }
