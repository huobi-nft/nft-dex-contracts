function createTypedData(messageData, contractAddress, chainId) {
    const domainType = [
        {name: "name", type: "string"},
        {name: "version", type: "string"},
        {name: "chainId", type: "uint256"},
        {name: "verifyingContract", type: "address"},
    ];

    const orderType = [
        {name: 'maker', type: 'address'},
        {name: 'taker', type: 'address'},
        {name: 'asset_recipient', type: 'address'},
        {name: 'royalty_recipient', type: 'address'},
        {name: 'royalty_rate', type: 'uint96'},
        {name: 'start', type: 'uint64'},
        {name: 'expire', type: 'uint64'},
        {name: 'maker_nonce', type: 'uint64'},
        {name: 'taker_get_nft', type: 'bool'},
        {name: 'allow_cex', type: 'bool'},
        {name: 'tokens', type: 'TokensForExchange'},
    ];

    // Not an EIP712Domain definition
    const TokensForExchangeType = [
        {name: 'nft', type: 'address'},
        {name: 'ft', type: 'address'},
        {name: 'nft_id', type: 'uint256'},
        {name: 'nft_amount', type: 'uint256'},
        {name: 'ft_amount', type: 'uint256'},
    ];

    const domainData = {
        name: "Simple NFT DEX",
        version: "Version 0.1.0",
        chainId: chainId,
        verifyingContract: contractAddress,
    };

    const typedData = {
        types: {
            EIP712Domain: domainType,
            FixedPriceOrder: orderType,
            TokensForExchange: TokensForExchangeType,
        },
        primaryType: "FixedPriceOrder",
        domain: domainData,
        message: messageData,
    };

    return typedData;
}

module.exports = {createTypedData};
