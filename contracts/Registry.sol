// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "./Proxy.sol";

contract Registry is IRegistry {

    mapping(address => address) public proxies; // user_address => user_proxy_address
    mapping(address => bool) public contracts; // contracts which can call user_proxy.proxy(...)
    mapping(address => bool) public destinations; // contracts which user_proxy.proxy(...) can call
    mapping(address => uint) public pending;

    address public proxyHub;
    uint64 public DELAY_PERIOD;
    bool public initialized;
    address public manager;

    event StartGrantAuthentication(address addr);
    event EndGrantAuthentication(address addr);
    event RevokeAuthentication(address addr);

    event StartGrantDelegateCall(address addr);
    event EndGrantDelegateCall(address addr);
    event RevokeDelegateCall(address addr);

    event ProxyOfUser(address[] user_array, address[] proxy_array);

    modifier onlyOperator() {
        require(IManager(manager).operators(msg.sender), "Caller is not an operator");
        _;
    }

    modifier onlyDAO() {
        require(IManager(manager).DAO() == msg.sender, "Caller is not the DAO");
        _;
    }

    function initialize(address _manager, address dex, uint64 delay_period,address _proxyHub) external {
        require(!initialized, "Contract was initialized");
        initialized = true;
        contracts[dex] = true;
        DELAY_PERIOD = delay_period;
        if (delay_period == 0) {
            DELAY_PERIOD = 2 weeks;
        }
        manager = _manager;
        proxyHub = _proxyHub;
    }

    function setProxyHub(address _proxyHub) external onlyDAO {
        require(_proxyHub != address(0),"ProxyHub can not be 0");
        proxyHub = _proxyHub;
    }

    function startGrantDelegateCall(address addr) external onlyOperator {
        require(!destinations[addr] && pending[addr] == 0, "Contract is already allowed in registry, or pending");
        pending[addr] = block.timestamp;
        emit StartGrantDelegateCall(addr);
    }

    function endGrantDelegateCall(address addr) external onlyOperator {
        require(
            !destinations[addr] && pending[addr] != 0 && ((pending[addr] + DELAY_PERIOD) < block.timestamp),
            "Contract is no longer pending or has already been approved by registry"
        );
        pending[addr] = 0;
        destinations[addr] = true;
        emit EndGrantDelegateCall(addr);
    }

    function revokeDelegateCall(address addr) external onlyOperator {
        require(destinations[addr], "Not in destinations");
        delete destinations[addr];
        emit RevokeDelegateCall(addr);

    }

    function startGrantAuthentication(address addr) external onlyOperator {
        require(!contracts[addr] && pending[addr] == 0, "Contract is already allowed in registry, or pending");
        pending[addr] = block.timestamp;
        emit StartGrantAuthentication(addr);
    }

    function endGrantAuthentication(address addr) external onlyOperator {
        require(
            !contracts[addr] && pending[addr] != 0 && ((pending[addr] + DELAY_PERIOD) < block.timestamp),
            "Contract is no longer pending or has already been approved by registry"
        );
        pending[addr] = 0;
        contracts[addr] = true;
        emit EndGrantAuthentication(addr);
    }

    function revokeAuthentication(address addr) external onlyOperator {
        require(contracts[addr], "Not in destinations");
        delete contracts[addr];
        emit RevokeAuthentication(addr);
    }

    function registerProxyOverride() external returns (address) {
        proxies[msg.sender] = proxyHub;
        address[] memory user_array = new address[](1);
        address[] memory proxy_array = new address[](1);
        user_array[0] = msg.sender;
        proxy_array[0] = proxyHub;
        emit ProxyOfUser(user_array, proxy_array);
        return proxyHub;
    }

    function registerProxyFor(address[] memory user_array) external {
        address[] memory proxy_array = new address[](user_array.length);
        for (uint256 i = 0; i < user_array.length; i++) {
            address user_i = user_array[i];
            address proxy_i = proxies[user_i];
            if (proxy_i == address(0)) {
                proxies[user_i] = proxyHub;
            }
            proxy_array[i] = proxy_i;
        }
        emit ProxyOfUser(user_array, proxy_array);
    }

    function transferAccessTo(address from, address to) external {
        address proxy = proxies[from];
        require(proxy == msg.sender, "Proxy transfer can only be called by the proxy");
        require(proxies[to] == address(0), "Proxy transfer has existing proxy as destination");
        proxies[to] = proxy;
        delete proxies[from];
        IProxy(proxy).transferOwnership(to);
    }

}

