// const Web3 = require('web3');
// const chai = require('chai');
// const expect = chai.expect;  // Using Expect style
// // const assert = chai.assert;  // Using Assert style
// // const should = chai.should();  // Using Should style
// require('dotenv').config();
//
// const {
//     generateTokenId,
//     getRandom,
//     getHDWalletProvider,
//     dexAbi,
//     dexBytecode,
//     nftAbi,
//     nftBytecode,
//     usdcAbi,
//     usdcBytecode
// } = require("../scripts/utils");
//
// const { signTypedData } = require("../scripts/eip712/signTypedData");
// const { createTypedData } = require('../scripts/eip712/eip712TypedData');
//
// const rpcUrl = "http://localhost:8545";
// const HDProvider = getHDWalletProvider(process.env.MNEMONICS, rpcUrl);
// const web3 = new Web3(HDProvider);
//
// const wallets = HDProvider.wallets;
// let addresses = [];
// let privateKeys = [];
//
// for (let key in wallets) {
//     addresses.push(key);
//     privateKeys.push(wallets[key].privateKey);
// }
//
// const maker = addresses[0]; // accounts[0]
// const taker = addresses[1]; // accounts[1]
//
// const chainId = 1;
// // const chainId = async () => { await web3.eth.net.getId();}
// // let chainId;
// // web3.eth.net.getId().then(
// //     res => {
// //         console.log(res);
// //         chainId = res;
// //     });
// // console.log("+++++++++++++++" + chainId);
//
//
// describe('Test contract:', async () => {
//     let dex, nft, dexAddr, nftAddr, usdc, usdcAddr, signer, accounts;
//     beforeEach('Deploy contracts', async () => {
//         accounts = await web3.eth.getAccounts();
//         signer = accounts[0];
//
//         dex = await new web3.eth.Contract(dexAbi)
//             .deploy({
//                 data: dexBytecode,
//                 arguments: ["D1verse NFT DEX", "Version 0.1.0", signer, signer, 1]
//             })
//             .send({
//                 from: signer,
//                 gas: 6000000
//             });
//
//         dexAddr = dex.options.address;
//         console.log("DEX deployed to: ",dexAddr);
//
//         nft = await new web3.eth.Contract(nftAbi)
//             .deploy({
//                 data: nftBytecode,
//                 arguments: [signer, "D1verse NFT", "D1NFT", "https://static.schoolbuy.top/media/ula/"]
//             })
//             .send({
//                 from: signer,
//                 gas: 6000000
//             });
//
//         nftAddr = nft.options.address;
//         console.log("NFT deployed to: ", nftAddr);
//
//         usdc = await new web3.eth.Contract(usdcAbi)
//             .deploy({
//                 data: usdcBytecode,
//                 arguments: [18, "USD Coin", "USDC"]
//             })
//             .send({
//                 from: signer,
//                 gas: 6000000
//             });
//         usdcAddr = usdc.options.address;
//         console.log("USDC deployed to: ", usdcAddr);
//     });
//
//     after( () => {
//         console.log('Test done!');
//     });
//
//     process.on('exit', (code) => {
//         console.log('EXITCODE:', code);
//     });
//
//     describe('Test NFT DEX', async () => {
//         it('Test setDexDAO', async () => {
//             const dexDAO = await dex.methods.dexDAO().call();
//             expect(dexDAO).equal(signer);
//             await dex.methods.setDexDAO(accounts[1]).send({from: signer});
//             expect(await dex.methods.dexDAO().call()).equal(accounts[1]);
//         });
//
//         it('Test setD1verseNFT', async () => {
//             await dex.methods.setD1verseNFT("0x974b068B2fA6B09555e2Ee91ec35373C58031644", true).send({from: signer});
//             const isD1verseNFT = await dex.methods.D1verseNFT("0x974b068B2fA6B09555e2Ee91ec35373C58031644").call();
//             expect(isD1verseNFT).equal(true);
//         });
//
//         it('Test setFeeRate', async () => {
//             await dex.methods.setFeeRate(30).send({from: signer});
//             const feeRate = await dex.methods.feeRate().call();
//             expect(feeRate).equal('30');
//         });
//
//         it('Test setFeeRecipient', async () => {
//             await dex.methods.setFeeRecipient(signer).send({from: signer});
//             const feeRecipient = await dex.methods.feeRecipient().call();
//             expect(feeRecipient).equal(signer);
//         });
//
//         it('Test setMaxRoyaltyRate', async () => {
//             await dex.methods.setMaxRoyaltyRate(50000).send({from: signer});
//             const maxRoyaltyRate = await dex.methods.maxRoyaltyRate().call();
//             expect(maxRoyaltyRate).equal('50000');
//         });
//
//         it('Test setAllNftAllowed', async () => {
//             await dex.methods.setAllNftAllowed(true).send({from: signer});
//             const isAllNftAllowed = await dex.methods.allNftAllowed().call();
//             expect(isAllNftAllowed).equal(true);
//         });
//
//         it('Test addAllowedNft', async () => {
//             await dex.methods.setNftAllowed(nftAddr, true).send({from: signer});
//             const isAllowedNft = await dex.methods.allowedNft(nftAddr).call();
//             expect(isAllowedNft).equal(true);
//         });
//
//         // it('Test setAllPaymentAllowed', async () => {
//         //     await dex.methods.setAllPaymentAllowed(true).send({from: signer});
//         //     const isAllPaymentAllowed = await dex.methods.allPaymentAllowed().call();
//         //     expect(isAllPaymentAllowed).equal(true);
//         // });
//
//         it('Test setPaymentAllowed', async () => {
//             await dex.methods.setPaymentAllowed(usdcAddr, 1).send({from: signer});
//             const isAllowedPayment = await dex.methods.allowedPayment(usdcAddr).call();
//             expect(isAllowedPayment).equal('1');
//         });
//
//         it('Test removeAllowedNft', async () => {
//             await dex.methods.setNftAllowed(nftAddr, false).send({from: signer});
//             const isAllowedNft = await dex.methods.allowedNft(nftAddr).call();
//             expect(isAllowedNft).equal(false);
//         });
//
//         it('Test removeAllowedPayment', async () => {
//             await dex.methods.setPaymentAllowed(usdcAddr, 0).send({from: signer});
//             const isAllowedPayment = await dex.methods.allowedPayment(usdcAddr).call();
//             expect(isAllowedPayment).equal('0');
//         });
//
//         it('Get Nft name', async () => {
//             const name = await dex.methods.name().call();
//             expect(name).equal("D1verse NFT DEX");
//         });
//
//         it('Get Nft version', async () => {
//             const version = await dex.methods.version().call();
//             expect(version).equal("Version 0.1.0");
//         });
//
//         it('Get feeDenominator', async () => {
//             const feeDenominator = await dex.methods.feeDenominator().call();
//             expect(feeDenominator).equal('1000000000');
//         });
//         //
//         it('Get hashEIP712Name', async () => {
//             const hashEIP712Name = await dex.methods.HashEIP712Name().call();
//             expect(hashEIP712Name).equal("0xa5afa91ae058836816b608fd6269364f909f6313bb6c814e80649669f52fe8f8");
//         });
//
//         it('Get HashEIP712Version', async () => {
//             const hashEIP712Version = await dex.methods.HashEIP712Version().call();
//             expect(hashEIP712Version).equal("0x49e16efb9bb18cdb3b0e89a6ef72a41de5c90f84ebb2afad624aaa3b07397a80");
//         });
//
//         it('Get HashEIP712Domain', async () => {
//             const HashEIP712Domain = await dex.methods.HashEIP712Domain().call();
//             expect(HashEIP712Domain).equal("0x8b73c3c69bb8fe3d512ecc4cf759cc79239f7b179b0ffacaa9a75d522b39400f");
//         });
//
//         it('Get HashOrderStruct', async () => {
//             const HashOrderStruct = await dex.methods.HashOrderStruct().call();
//             expect(HashOrderStruct).equal("0x1e1c3d175b1b6bb91c7375b3f0de23ad204dc822b9f54ab5bd66142decc2bfe1");
//         });
//
//         it('Get userNonce', async () => {
//             const userNonce = await dex.methods.userNonce(maker).call();
//             expect(userNonce).equal('0');
//         });
//     });
//
//     describe("\nTest signature: ", () => {
//         it('Signature check should succeed', async () => {
//             // const chainId = await web3.eth.net.getId();
//             const tokenId = generateTokenId(maker, getRandom(10), getRandom(20)).toHexString();
//             // console.log("Current tokenId:", tokenId);
//             const paymentToken = "0x0000000000000000000000000000000000000000";
//             const fixedPrice = web3.utils.toWei('1', 'ether');
//             const messageData = {
//                 taker: taker,
//                 maker: maker,
//                 maker_nonce: 0,
//                 listing_time: 1649993354,
//                 expiration_time: 2649398937,
//                 nft_contract: nftAddr,
//                 token_id: tokenId,
//                 payment_token: paymentToken,
//                 fixed_price: fixedPrice,
//                 royalty_rate: 50000000, // 50,000,000 / 1,000,000,000 == 5%
//                 royalty_recipient: maker,
//             };
//
//             const typedData = createTypedData(messageData, dexAddr, chainId);
//             const [signatureMaker, signatureTaker] = signTypedData(privateKeys[0], privateKeys[1], typedData);
//
//             await nft.methods.setD1verseDex(dexAddr, true).send({from: signer});
//             await dex.methods.setD1verseNFT(nftAddr, true).send({from: signer});
//
//             const {
//                 order_digest,
//                 order_bytes
//             } = await dex.methods.checkOrder(taker, messageData, signatureMaker, signatureTaker).call();
//
//             expect(order_digest).to.not.equal('undefined');
//             expect(order_bytes).to.not.equal('undefined');
//         });
//     });
//
//     describe("\nUse local currency to pay for order transaction:", () => {
//         it('Test exchangeFixedPrice should successfully！', async () => {
//
//             await nft.methods.setD1verseDex(dexAddr, true).send({from: signer});
//             await dex.methods.setD1verseNFT(nftAddr, true).send({from: signer});
//
//
//             const tokenId = generateTokenId(maker, getRandom(10), getRandom(20)).toHexString();
//             // console.log("Current tokenId:", tokenId);
//             const paymentToken = "0x0000000000000000000000000000000000000000";
//             const fixedPrice = web3.utils.toWei('1', 'ether');
//             const messageData = {
//                 taker: taker,
//                 maker: maker,
//                 maker_nonce: 0,
//                 listing_time: 1649993354,
//                 expiration_time: 2649398937,
//                 nft_contract: nftAddr,
//                 token_id: tokenId,
//                 payment_token: paymentToken,
//                 fixed_price: fixedPrice,
//                 royalty_rate: 50000000, // 50,000,000 / 1,000,000,000 == 5%
//                 royalty_recipient: maker,
//             };
//             const typedData = createTypedData(messageData, dexAddr, chainId);
//             const [signatureMaker, signatureTaker] = signTypedData(privateKeys[0], privateKeys[1], typedData);
//             const {
//                 order_digest,
//                 order_bytes
//             } = await dex.methods.checkOrder(taker, messageData, signatureMaker, signatureTaker).call();
//
//             const ret = await dex.methods.exchangeFixedPrice(
//                 true, taker, messageData, signatureMaker, signatureTaker
//             ).send({from: signer, value: web3.utils.toWei('1', 'ether')})
//                 .then(res => {
//                     // console.log(res);
//                     // return ('Successfully!');
//                 }).catch(e => {
//                     console.error(e);
//                     // return ('Failed!');
//                 });
//
//             const isFinalizedOrder = await dex.methods.finalizedOrder(order_digest).call();
//             // console.log(isFinalizedOrder)
//             expect(isFinalizedOrder).equal(true);
//             // expect(isFinalizedOrder).to.not.equal(false);
//         });
//
//         it('Test exchangeFixedPrice should Failed！', async () => {
//
//             await nft.methods.setD1verseDex(dexAddr, true).send({from: signer});
//             await dex.methods.setD1verseNFT(nftAddr, true).send({from: signer});
//
//             const tokenId = generateTokenId(maker, getRandom(10), getRandom(20)).toHexString();
//             console.log("Current tokenId:", tokenId);
//             const paymentToken = "0x0000000000000000000000000000000000000000";
//             const fixedPrice = web3.utils.toWei('1', 'ether');
//             const messageData = {
//                 taker: taker,
//                 maker: maker,
//                 maker_nonce: 0,
//                 listing_time: 1649993354,
//                 expiration_time: 2649398937,
//                 nft_contract: nftAddr,
//                 token_id: tokenId,
//                 payment_token: paymentToken,
//                 fixed_price: fixedPrice,
//                 royalty_rate: 50000000, // 50,000,000 / 1,000,000,000 == 5%
//                 royalty_recipient: maker,
//             };
//
//             const typedData = createTypedData(messageData, dexAddr, chainId);
//             const [signatureMaker, signatureTaker] = signTypedData(privateKeys[0], privateKeys[1], typedData);
//
//             const {
//                 order_digest,
//                 order_bytes
//             } = await dex.methods.checkOrder(taker, messageData, signatureMaker, signatureTaker).call();
//             await dex.methods.cancelOrder(order_digest).send({from: signer}) // cancelOrder
//
//             const ret = await dex.methods.exchangeFixedPrice(
//                 true, taker, messageData, signatureMaker, signatureTaker
//             ).send({from: signer, value: web3.utils.toWei('1', 'ether')})
//                 .then(res => {
//                     // console.log(res);
//                     // return ('Successfully!');
//                 }).catch(e => {
//                     console.error(e); // revert The order is finalized or canceled
//                     // return ('Failed!');
//                 });
//
//             const isFinalizedOrder = await dex.methods.finalizedOrder(order_digest).call();
//             // console.log(isFinalizedOrder);
//             expect(isFinalizedOrder).to.not.equal(true);
//             // expect(ret).equal("Failed!");
//             // expect(ret).to.not.equal('Successfully!');
//         });
//     });
//
//     describe("\nUse foobarToken to pay for order transaction:", () => {
//         it('Test exchangeFixedPrice should successfully！', async () => {
//
//             await nft.methods.setD1verseDex(dexAddr, true).send({from: signer});
//             await dex.methods.setD1verseNFT(nftAddr, true).send({from: signer});
//             await dex.methods.setPaymentAllowed(usdcAddr, 1).send({from: signer});
//             await usdc.methods.mint(accounts[1], web3.utils.toWei('100', 'ether')).send({from: signer});
//             // await usdc.methods.transfer(accounts[1], web3.utils.toWei('100', 'ether')).send({from: signer});
//             await usdc.methods.approve(dexAddr, web3.utils.toWei('50', 'ether')).send({from: accounts[1]});
//
//             const tokenId = generateTokenId(maker, getRandom(10), getRandom(20)).toHexString();
//             console.log("Current tokenId:", tokenId);
//             const paymentToken = usdcAddr;
//             const fixedPrice = web3.utils.toWei('20', 'ether');
//             const messageData = {
//                 taker: taker,
//                 maker: maker,
//                 maker_nonce: 0,
//                 listing_time: 1649993354,
//                 expiration_time: 2649398937,
//                 nft_contract: nftAddr,
//                 token_id: tokenId,
//                 payment_token: paymentToken,
//                 fixed_price: fixedPrice,
//                 royalty_rate: 50000000, // 50,000,000 / 1,000,000,000 == 5%
//                 royalty_recipient: maker,
//             };
//             const typedData = createTypedData(messageData, dexAddr, chainId);
//             const [signatureMaker, signatureTaker] = signTypedData(privateKeys[0], privateKeys[1], typedData);
//             const {
//                 order_digest,
//                 order_bytes
//             } = await dex.methods.checkOrder(taker, messageData, signatureMaker, signatureTaker).call();
//             console.log(order_bytes);
//
//             const ret = await dex.methods.exchangeFixedPrice(
//                 true, taker, messageData, signatureMaker, signatureTaker
//             ).send({from: signer})
//                 .then(res => {
//                     // console.log(res);
//                     // return ('Successfully!');
//                 }).catch(e => {
//                     console.error(e);
//                     // return ('Failed!');
//                 });
//             console.log(ret);
//
//             const isFinalizedOrder = await dex.methods.finalizedOrder(order_digest).call();
//             console.log(isFinalizedOrder)
//             expect(isFinalizedOrder).equal(true);
//             // expect(isFinalizedOrder).to.not.equal(false);
//         });
//
//         it('Test exchangeFixedPrice should failed！', async () => {
//
//             await nft.methods.setD1verseDex(dexAddr, true).send({from: signer});
//             await dex.methods.setD1verseNFT(nftAddr, true).send({from: signer});
//             await dex.methods.setPaymentAllowed(usdcAddr, 1).send({from: signer});
//             await usdc.methods.mint(accounts[1], web3.utils.toWei('100', 'ether')).send({from: signer});
//             // await usdc.methods.transfer(accounts[1], web3.utils.toWei('100', 'ether')).send({from: signer});
//             await usdc.methods.approve(dexAddr, web3.utils.toWei('50', 'ether')).send({from: accounts[1]});
//
//             const tokenId = generateTokenId(maker, getRandom(10), getRandom(20)).toHexString();
//             console.log("Current tokenId:", tokenId);
//
//             const paymentToken = usdcAddr;
//             const fixedPrice = web3.utils.toWei('20', 'ether');
//             const messageData = {
//                 taker: taker,
//                 maker: maker,
//                 maker_nonce: 0,
//                 listing_time: 1649993354,
//                 expiration_time: 2649398937,
//                 nft_contract: nftAddr,
//                 token_id: tokenId,
//                 payment_token: paymentToken,
//                 fixed_price: fixedPrice,
//                 royalty_rate: 50000000, // 50,000,000 / 1,000,000,000 == 5%
//                 royalty_recipient: maker,
//             };
//
//             const typedData = createTypedData(messageData, dexAddr, chainId);
//             const [signatureMaker, signatureTaker] = signTypedData(privateKeys[0], privateKeys[1], typedData);
//             const {
//                 order_digest,
//                 order_bytes
//             } = await dex.methods.checkOrder(taker, messageData, signatureMaker, signatureTaker).call();
//             await dex.methods.cancelAllOrders().send({from: signer}) // cancelAllOrders
//             console.log(order_bytes);
//
//             const ret = await dex.methods.exchangeFixedPrice(
//                 true, taker, messageData, signatureMaker, signatureTaker
//             ).send({from: signer})
//                 .then(res => {
//                     console.log(res);
//                     // return ('Successfully!');
//                 }).catch(e => {
//                     console.error(e); // revert Maker nonce doesn't match
//                     // return ('Failed!');
//                 });
//             console.log(ret);
//             const isFinalizedOrder = await dex.methods.finalizedOrder(order_digest).call();
//             console.log(isFinalizedOrder)
//             expect(isFinalizedOrder).to.not.equal(true);
//         });
//     });
//
//     describe("\nMaker is buyer, Taker is seller:", () => {
//         it('Test exchangeFixedPrice should successfully！', async () => {
//
//             await nft.methods.setD1verseDex(dexAddr, true).send({from: signer});
//             await dex.methods.setD1verseNFT(nftAddr, true).send({from: signer});
//
//             const tokenId = generateTokenId(taker, getRandom(10), getRandom(20)).toHexString();
//             console.log("Current tokenId:", tokenId);
//             const paymentToken = "0x0000000000000000000000000000000000000000";
//             const fixedPrice = web3.utils.toWei('1', 'ether');
//             const messageData = {
//                 taker: taker,
//                 maker: maker,
//                 maker_nonce: 0,
//                 listing_time: 1649993354,
//                 expiration_time: 2649398937,
//                 nft_contract: nftAddr,
//                 token_id: tokenId,
//                 payment_token: paymentToken,
//                 fixed_price: fixedPrice,
//                 royalty_rate: 50000000, // 50,000,000 / 1,000,000,000 == 5%
//                 royalty_recipient: maker,
//             };
//
//             const typedData = createTypedData(messageData, dexAddr, chainId);
//             const [signatureMaker, signatureTaker] = signTypedData(privateKeys[0], privateKeys[1], typedData);
//             const {
//                 order_digest,
//                 order_bytes
//             } = await dex.methods.checkOrder(taker, messageData, signatureMaker, signatureTaker).call();
//
//             const ret = await dex.methods.exchangeFixedPrice(
//                 false, taker, messageData, signatureMaker, signatureTaker
//             ).send({from: signer, value: web3.utils.toWei('1', 'ether')})
//                 .then(res => {
//                     console.log(res);
//                     // return ('Successfully!');
//                 }).catch(e => {
//                     console.error(e);
//                     // return ('Failed!');
//                 });
//
//             const isFinalizedOrder = await dex.methods.finalizedOrder(order_digest).call();
//             console.log(isFinalizedOrder)
//             expect(isFinalizedOrder).equal(true);
//             expect(isFinalizedOrder).to.not.equal(false);
//         });
//     })
// });
//
