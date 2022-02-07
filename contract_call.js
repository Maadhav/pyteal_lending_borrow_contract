const algosdk = require('algosdk');
const helper = require('./contract_helper')

// const { transaction } = require('algosdk.future');

async function callEverything() {

    try {
        const mnemonic = "exit clap write shield video mistake oblige police flush feature snake category wisdom because boring spring early rally turtle banana modify habit approve able rotate"
        const address = "IODQCCDAR55ACZSW744KRFMTXSOQYLE4W572AJTQSNWX4A5RWXO4SAITXA"

        // let myAccount = createAccount();
        let creatorPrivateKey = helper.getPrrivatekeyFromMnemonic(mnemonic).sk;
        console.log("creatorPrivateKey ", creatorPrivateKey);

        const algodToken = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
        const algodServer = 'http://localhost';
        const algodPort = 4001;

        let algodClient = new algosdk.Algodv2(algodToken, algodServer, algodPort);

        let accountInfo = await algodClient.accountInformation(address).do();
        accountInfo.sk = creatorPrivateKey;
        console.log("accountInfo ", accountInfo);
        if (accountInfo.amount < algosdk.ALGORAND_MIN_TX_FEE) {
            console.log("Please add funds before proceeding...... ", accountInfo);
        }

        let localInts = 2
        let localBytes = 2
        let globalInts = 3
        let globalBytes = 3

        let appArgs = [];

        const appId = await helper.createApp(algodClient, accountInfo, localInts, localBytes, globalInts, globalBytes, appArgs);

        const optInTxn = await helper.optInTxn(algodClient, accountInfo, appId);

        var appArgs1 = [];
        appArgs1.push(new Uint8Array(Buffer.from("withdraw")));
        appArgs1.push(new Uint8Array(Buffer.from("100000")));
        console.log("appArgs1: ", appArgs1)
        const callApp = await helper.callApp(algodClient, accountInfo, appArgs1, appId);


        var appArgs2 = [];
        appArgs2.push(new Uint8Array(Buffer.from("repay")));
        console.log("repay: ", appArgs2)
        const callAppWithPayment = await helper.callAppWithPayment(algodClient, mnemonic, appId,appArgs2, 1000000);

        // console.log("global_schema ", global_schema);

        // //Check your balance
        // // let accountInfo = await algodClient.accountInformation(myAccount.addr).do();
        // // let accountInfo = await algodClient.accountInformation(address).do();

        // console.log("Account balance: %d microAlgos", accountInfo.amount);

        // Construct the transaction
        // let params = await algodClient.getTransactionParams().do();
        // // comment out the next two lines to use suggested fee
        // params.fee = algosdk.ALGORAND_MIN_TX_FEE;
        // params.flatFee = true;

        // // receiver defined as TestNet faucet address 
        // const receiver = "HZ57J3K46JIJXILONBBZOHX6BKPXEM2VVXNRFSUED6DKFD5ZD24PMJ3MVA";
        // const enc = new TextEncoder();
        // const note = enc.encode("Hello World");
        // let amount = 1000000;
        // let sender = myAccount.addr;
        // let txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        //     from: sender, 
        //     to: receiver, 
        //     amount: amount, 
        //     note: note, 
        //     suggestedParams: params
        // });


        // // Sign the transaction
        // let signedTxn = txn.signTxn(myAccount.sk);
        // let txId = txn.txID().toString();
        // console.log("Signed transaction with txID: %s", txId);

        // // Submit the transaction
        // await algodClient.sendRawTransaction(signedTxn).do();

        // // Wait for confirmation
        // let confirmedTxn = await waitForConfirmation(algodClient, txId, 4);
        // //Get the completed Transaction
        // console.log("Transaction " + txId + " confirmed in round " + confirmedTxn["confirmed-round"]);
        // var string = new TextDecoder().decode(confirmedTxn.txn.txn.note);
        // console.log("Note field: ", string);
        // accountInfo = await algodClient.accountInformation(myAccount.addr).do();
        // console.log("Transaction Amount: %d microAlgos", confirmedTxn.txn.txn.amt);        
        // console.log("Transaction Fee: %d microAlgos", confirmedTxn.txn.txn.fee);

        // console.log("Account balance: %d microAlgos", accountInfo.amount);
    }
    catch (err) {
        console.log("err", err);
    }
    process.exit();
};

callEverything();

