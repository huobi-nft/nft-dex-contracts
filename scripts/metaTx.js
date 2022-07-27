const {ethers} = require("hardhat");
const ethUtil = require('ethereumjs-util')
const abi = require('ethereumjs-abi');
let types;

const chainId = 256; // HECO Testnet
const rpcUrl = "https://http-testnet.hecochain.com"; // HECO Testnet
const metaTxAddr = "0xDfEEf61B2E6A34987bDC41cfdAaFF53c6a50ec40";
// const metaTxAddr = "0x17AC9d29eC6eD3d991e98920FA8CF350C0BC73DB";

const domainType = [
    {name: "name", type: "string"},
    {name: "version", type: "string"},
    {name: "chainId", type: "uint256"},
    {name: "verifyingContract", type: "address"},
];
const metaTxType = [
    {name: "nonce", type: "uint256"},
    {name: "from", type: "address"},
    {name: "functionSignature", type: "bytes"},
];

const domainData = {
    name: "MetaTx",
    version: "Version 0.1.0",
    chainId: chainId,
    verifyingContract: metaTxAddr,
};

function encodeType(primaryType) {
    // Get dependencies primary first, then alphabetical
    let deps = dependencies(primaryType);
    deps = deps.filter(t => t !== primaryType);
    deps = [primaryType].concat(deps.sort());

    // Format as a string with fields
    let result = '';
    for (let type of deps) {
        result += `${type}(${types[type].map(({ name, type }) => `${type} ${name}`).join(',')})`;
    }
    return result;
}

function encodeData(primaryType, data) {
    let encTypes = [];
    let encValues = [];

    // Add typeHash
    encTypes.push('bytes32');
    encValues.push(typeHash(primaryType));

    // Add field contents
    for (let field of types[primaryType]) {
        let value = data[field.name];
        if (field.type === 'string' || field.type === 'bytes') {
            encTypes.push('bytes32');
            value = ethUtil.keccakFromString(value, 256);
            encValues.push(value);
        } else if (types[field.type] !== undefined) {
            encTypes.push('bytes32');
            value = ethUtil.keccak256(encodeData(field.type, value));
            encValues.push(value);
        } else if (field.type.lastIndexOf(']') === field.type.length - 1) {
            throw 'TODO: Arrays currently unimplemented in encodeData';
        } else {
            encTypes.push(field.type);
            encValues.push(value);
        }
        // console.log(encTypes);
        // console.log(encValues);
    }
    return abi.rawEncode(encTypes, encValues); //
}

function structHash(primaryType, data) {
    return ethUtil.keccak256(encodeData(primaryType, data));
}

function typeHash(primaryType) {
    return ethUtil.keccakFromString(encodeType(primaryType), 256);
}

// Recursively finds all the dependencies of a type
function dependencies(primaryType, found = []) {
    if (found.includes(primaryType)) {
        return found;
    }
    if (types[primaryType] === undefined) {
        return found;
    }
    found.push(primaryType);
    for (let field of types[primaryType]) {
        for (let dep of dependencies(field.type, found)) {
            if (!found.includes(dep)) {
                found.push(dep);
            }
        }
    }
    return found;
}

function signHash(typedData) {
    types = typedData.types;
    return ethUtil.keccak256(
        Buffer.concat([
            Buffer.from('1901', 'hex'), // rlp prefix
            structHash('EIP712Domain', typedData.domain), // DomainData
            structHash(typedData.primaryType, typedData.message), //
        ]),
    );
}

// =============================
async function main() {
    await interactWithContract();
    console.log("Done!");
}

main()
    .then(() => {
        process.exit(0);
    })
    .catch((err) => {
        console.error(err);
        process.exit(1);
    })

async function interactWithContract() {
    const privKey = "4118fa60d0989f466658fd92eabdcf63fc9423482285d4482764ba6c6cdb5425";
    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    const signer = new ethers.Wallet(privKey, provider);
    const signerBalance = await provider.getBalance(signer.address);
    console.log("\nSigner address:", signer.address);
    console.log("\nSigner balance:", signerBalance);

    const funcI = [
        "function transferFrom(address from, address to, uint256 tokenId)"
    ];
    const iface = new ethers.utils.Interface(funcI);
    const data = iface.encodeFunctionData("transferFrom", [signer.address, "0x429ebD9365061DaBb853de89c134F9b79468a952", 123]);
    // const decodedData = iface.decodeFunctionData("transferFrom", data);
    console.log("FunctionSignature: %s\n", data);
    // console.log("decodedData: %s\n", decodedData);
    // console.log(ethers.utils.keccak256(data));
    const metaTxObj = {
        nonce: 0,
        from: signer.address,
        functionSignature: data,
    };

    const typedData = {
        types: {
            EIP712Domain: domainType,
            MetaTransaction: metaTxType,
        },
        primaryType: "MetaTransaction",
        domain: domainData,
        message: metaTxObj,
    };

    const signature = ethUtil.ecsign(signHash(typedData), Buffer.from(privKey, "hex"));
    const sigV = signature.v.toString(10);
    const sigR = "0x" + signature.r.toString("hex");
    const sigS = "0x" + signature.s.toString("hex");
    console.log("V:%s\nR:%s\nS:%s", sigV, sigR, sigS);

    const MetaTx = await ethers.getContractFactory('MetaTx');
    const metaTx = MetaTx.attach(metaTxAddr);
    const ret = await metaTx.connect(signer).executeMetaTransaction(signer.address, data, sigV, sigR, sigS );
    // {
    //         value: ethers.utils.parseEther("0.000000000001").toString()
    // }

    console.log("Call the executeMetaTransaction function return -> ", ret);
}
