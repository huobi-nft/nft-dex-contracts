const ethUtil = require('ethereumjs-util');
const abi = require('ethereumjs-abi');
let types;

function signTypedData(makerPrivkey, takerPrivkey, maker_order_data, taker_order_data) {
    const makerSign = ethUtil.ecsign(signHash(maker_order_data), makerPrivkey);
    const takerSign = ethUtil.ecsign(signHash(taker_order_data), takerPrivkey);
    return [
        {
            v: makerSign.v.toString(10),
            r: "0x" + makerSign.r.toString('hex'),
            s: "0x" + makerSign.s.toString('hex')
        },
        {
            v: takerSign.v.toString(10),
            r: "0x" + takerSign.r.toString('hex'),
            s: "0x" + takerSign.s.toString('hex')
        },
    ]
}

function signHash(typedData) {
    types = typedData.types;
    return ethUtil.keccak256(
        Buffer.concat([
            Buffer.from('1901', 'hex'), // RLP prefix
            structHash('EIP712Domain', typedData.domain), // DomainData
            structHash(typedData.primaryType, typedData.message), // FixedPriceOrder
        ]),
    );
}

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

module.exports = {signTypedData};

