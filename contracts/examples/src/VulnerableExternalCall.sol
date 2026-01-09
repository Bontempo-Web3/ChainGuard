// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title VulnerableExternalCall
 * @notice Contract with external call vulnerabilities
 * @dev VULNERABILITIES:
 * 1. Unchecked external call
 * 2. Call to unknown address
 * 3. DoS via revert
 * 4. Front-running
 */

/**
 * @title UncheckedCall
 * @notice Contract that does not verify return values of calls
 */
contract UncheckedCall {
    address public owner;
    
    event PaymentSent(address to, uint256 amount);
    event CallExecuted(address target, bytes data);
    
    constructor() payable {
        owner = msg.sender;
    }
    
    /**
     * @notice VULNERABILITY 1: Call without checking return value
     */
    function sendPayment(address payable _to, uint256 _amount) external {
        require(msg.sender == owner, "Only owner");
        
        // VULNERABLE: Does not check if the transfer succeeded
        _to.call{value: _amount}("");
        
        emit PaymentSent(_to, _amount);
    }
    
    /**
     * @notice VULNERABILITY 2: Multiple calls without verification
     */
    function batchPayment(address payable[] calldata _recipients, uint256 _amount) external {
        require(msg.sender == owner, "Only owner");
        
        for (uint256 i = 0; i < _recipients.length; i++) {
            // VULNERABLE: If one fails, continues without warning
            _recipients[i].call{value: _amount}("");
            emit PaymentSent(_recipients[i], _amount);
        }
    }
    
    /**
     * @notice VULNERABILITY 3: Arbitrary call without verification
     */
    function executeCall(address _target, bytes calldata _data) external {
        require(msg.sender == owner, "Only owner");
        
        // VULNERABLE: Does not check return value
        _target.call(_data);
        
        emit CallExecuted(_target, _data);
    }
    
    receive() external payable {}
}

/**
 * @title DoSVulnerable
 * @notice Contract vulnerable to DoS
 */
contract DoSVulnerable {
    address public owner;
    address[] public participants;
    mapping(address => uint256) public balances;
    
    event Deposited(address user, uint256 amount);
    event Refunded(address user, uint256 amount);
    
    constructor() {
        owner = msg.sender;
    }
    
    function deposit() external payable {
        require(msg.value > 0, "Must deposit something");
        
        balances[msg.sender] += msg.value;
        participants.push(msg.sender);
        
        emit Deposited(msg.sender, msg.value);
    }
    
    /**
     * @notice VULNERABILITY 4: DoS via revert
     * @dev If one participant reverts, nobody gets a refund
     */
    function refundAll() external {
        require(msg.sender == owner, "Only owner");
        
        // VULNERABLE: Loop can be blocked by a malicious participant
        for (uint256 i = 0; i < participants.length; i++) {
            address participant = participants[i];
            uint256 amount = balances[participant];
            
            if (amount > 0) {
                balances[participant] = 0;
                
                // VULNERABLE: If participant reverts, the whole transaction fails
                payable(participant).transfer(amount);
                
                emit Refunded(participant, amount);
            }
        }
    }
    
    /**
     * @notice VULNERABILITY 5: DoS via gas limit
     */
    function refundAllUnchecked() external {
        require(msg.sender == owner, "Only owner");
        
        // VULNERABLE: Array can grow indefinitely
        // Eventually will exceed gas limit
        for (uint256 i = 0; i < participants.length; i++) {
            address participant = participants[i];
            uint256 amount = balances[participant];
            
            if (amount > 0) {
                balances[participant] = 0;
                (bool success, ) = payable(participant).call{value: amount}("");
                // Ignores failures, but can still run out-of-gas
                if (success) {
                    emit Refunded(participant, amount);
                }
            }
        }
    }
    
    receive() external payable {}
}

/**
 * @title MaliciousReceiver
 * @notice Contract that causes DoS by reverting
 */
contract MaliciousReceiver {
    receive() external payable {
        // Always reverts to cause DoS
        revert("I refuse payments!");
    }
}

/**
 * @title FrontRunVulnerable
 * @notice Contract vulnerable to front-running
 */
contract FrontRunVulnerable {
    address public owner;
    uint256 public price;
    address public buyer;
    
    event PriceUpdated(uint256 newPrice);
    event ItemPurchased(address buyer, uint256 price);
    
    constructor() {
        owner = msg.sender;
        price = 1 ether;
    }
    
    /**
     * @notice VULNERABILITY 6: Front-running on price
     */
    function updatePrice(uint256 _newPrice) external {
        require(msg.sender == owner, "Only owner");
        
        // VULNERABLE: Someone can buy before this tx is mined
        price = _newPrice;
        emit PriceUpdated(_newPrice);
    }
    
    /**
     * @notice VULNERABILITY 7: Purchase without slippage protection
     */
    function purchase() external payable {
        // VULNERABLE: Price can change between submission and mining
        require(msg.value >= price, "Insufficient payment");
        
        buyer = msg.sender;
        emit ItemPurchased(msg.sender, price);
        
        // Refund excess
        if (msg.value > price) {
            payable(msg.sender).transfer(msg.value - price);
        }
    }
    
    /**
     * @notice VULNERABILITY 8: Approve race condition
     */
    mapping(address => mapping(address => uint256)) public allowances;
    
    function approve(address _spender, uint256 _amount) external {
        // VULNERABLE: Classic ERC20 front-running
        // Spender can use old allowance + new one
        allowances[msg.sender][_spender] = _amount;
    }
}

/**
 * @title ReentrancyViaCallback
 * @notice Reentrancy via callback
 */
contract ReentrancyViaCallback {
    mapping(address => uint256) public balances;
    
    event Deposited(address user, uint256 amount);
    event Withdrawn(address user, uint256 amount);
    
    function deposit() external payable {
        balances[msg.sender] += msg.value;
        emit Deposited(msg.sender, msg.value);
    }
    
    /**
     * @notice VULNERABILITY 9: Callback before updating state
     */
    function withdrawWithCallback(address _callback) external {
        uint256 amount = balances[msg.sender];
        require(amount > 0, "No balance");
        
        // VULNERABLE: Calls callback BEFORE zeroing balance
        if (_callback != address(0)) {
            (bool success, ) = _callback.call(
                abi.encodeWithSignature("onWithdraw(address,uint256)", msg.sender, amount)
            );
            require(success, "Callback failed");
        }
        
        // State updated AFTER the callback
        balances[msg.sender] = 0;
        payable(msg.sender).transfer(amount);
        
        emit Withdrawn(msg.sender, amount);
    }
    
    /**
     * @notice VULNERABILITY 10: Call to untrusted address
     */
    function executeArbitraryCall(address _target, bytes calldata _data) external {
        // VULNERABLE: Allows call to any address with any data
        (bool success, ) = _target.call(_data);
        require(success, "Call failed");
    }
}

/**
 * @title GasGriefing
 * @notice Vulnerable to gas griefing attack
 */
contract GasGriefing {
    address public owner;
    
    constructor() {
        owner = msg.sender;
    }
    
    /**
     * @notice VULNERABILITY 11: Does not limit gas in subcall
     */
    function relayCall(address _target, bytes calldata _data) external {
        require(msg.sender == owner, "Only owner");
        
        // VULNERABLE: Passes all available gas
        // Target can consume all gas and cause failure
        (bool success, ) = _target.call(_data);
        require(success, "Relay failed");
    }
    
    /**
     * @notice Version with gas limit (safer)
     */
    function relayCallSafe(address _target, bytes calldata _data, uint256 _gasLimit) external {
        require(msg.sender == owner, "Only owner");
        
        (bool success, ) = _target.call{gas: _gasLimit}(_data);
        require(success, "Relay failed");
    }
}
