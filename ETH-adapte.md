后续若要对接以太坊链，需和业务同学，讨论好Gas费问题。
以太坊系统的处理，由于Gas费较高，在买家用现货账户购买时，后台Operator调用
cexFixedPrice(FixedPriceOrder memory maker_order, Sig memory maker_sig, address taker)
需支付Gas费。
Gas费，可能需要计算到买家费用中。

另外，若考虑节省Gas费，以太坊系统，可以只部署一个Proxy合约，所有用户可共享同一个Proxy，后台数据库表以及后端代码，无需改动，架构无需变化，只需要在表中记录<alice, common_proxy_address> <bob, common_proxy_address>...


1. gas fee
2. single proxy
3. other NFTs support

4. tokenID change?
5. 





痛点：

gas price 
