// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title VulnerableAuth
 * @notice Contract with authentication vulnerabilities
 * @dev VULNERABILITIES:
 * 1. tx.origin authentication
 * 2. Missing access control
 * 3. Weak randomness
 * 4. Timestamp dependence
 */

/**
 * @title TxOriginWallet
 * @notice Wallet that uses tx.origin (VULNERABLE)
 */
contract TxOriginWallet {
    address public owner;
    
    event Withdrawal(address to, uint256 amount);
    
    constructor() payable {
        owner = msg.sender;
    }
    
    /**
     * @notice VULNERABILITY 1: Uses tx.origin instead of msg.sender
     * @dev Allows phishing attack
     */
    function withdraw(address payable _to, uint256 _amount) external {
        // VULNERABLE: tx.origin can be exploited via intermediate contract
        require(tx.origin == owner, "Not owner");
        
        _to.transfer(_amount);
        emit Withdrawal(_to, _amount);
    }
    
    /**
     * @notice Correct function (for comparison)
     */
    function withdrawSafe(address payable _to, uint256 _amount) external {
        require(msg.sender == owner, "Not owner");
        _to.transfer(_amount);
        emit Withdrawal(_to, _amount);
    }
    
    receive() external payable {}
}

/**
 * @title PhishingAttacker
 * @notice Contract that exploits tx.origin vulnerability
 */
contract PhishingAttacker {
    TxOriginWallet public wallet;
    address public attacker;
    
    constructor(address _wallet) {
        wallet = TxOriginWallet(payable(_wallet));
        attacker = msg.sender;
    }
    
    /**
     * @notice Attack: Owner calls this function thinking it is innocent
     * @dev But it calls wallet.withdraw() and tx.origin is still the owner!
     */
    function claimReward() external {
        // Owner thinks they are claiming a reward
        // But in fact they are authorizing a withdrawal!
        wallet.withdraw(payable(attacker), address(wallet).balance);
    }
}

/**
 * @title WeakRandomness
 * @notice Lottery with weak randomness
 */
contract WeakRandomness {
    address public owner;
    uint256 public jackpot;
    
    event Winner(address winner, uint256 amount);
    
    constructor() payable {
        owner = msg.sender;
        jackpot = msg.value;
    }
    
    /**
     * @notice VULNERABILITY 2: Randomness based on block.timestamp
     */
    function playLottery() external payable {
        require(msg.value == 0.1 ether, "Must pay 0.1 ETH");
        
        jackpot += msg.value;
        
        // VULNERABLE: Miner can manipulate timestamp
        // VULNERABLE: Predictable via block.timestamp
        uint256 random = uint256(keccak256(abi.encodePacked(
            block.timestamp,
            block.difficulty,
            msg.sender
        ))) % 100;
        
        if (random < 10) { // 10% chance
            uint256 prize = jackpot;
            jackpot = 0;
            payable(msg.sender).transfer(prize);
            emit Winner(msg.sender, prize);
        }
    }
    
    /**
     * @notice VULNERABILITY 3: Even weaker randomness
     */
    function quickPlay() external payable {
        require(msg.value == 0.1 ether, "Must pay 0.1 ETH");
        
        // VULNERABLE: Only block.timestamp
        if (block.timestamp % 10 == 0) {
            payable(msg.sender).transfer(address(this).balance);
        }
    }
    
    receive() external payable {
        jackpot += msg.value;
    }
}

/**
 * @title TimestampDependence
 * @notice Contract with timestamp dependence
 */
contract TimestampDependence {
    address public owner;
    uint256 public unlockTime;
    
    event Locked(uint256 unlockTime);
    event Unlocked(address by);
    
    constructor() payable {
        owner = msg.sender;
    }
    
    /**
     * @notice VULNERABILITY 4: Timestamp manipulation
     */
    function lockFunds(uint256 _seconds) external {
        require(msg.sender == owner, "Only owner");
        
        // VULNERABLE: Miner can manipulate timestamp by ~15 seconds
        unlockTime = block.timestamp + _seconds;
        emit Locked(unlockTime);
    }
    
    /**
     * @notice VULNERABILITY 5: Weak time check
     */
    function unlock() external {
        // VULNERABLE: Miner can adjust timestamp to pass this check
        require(block.timestamp >= unlockTime, "Still locked");
        
        payable(owner).transfer(address(this).balance);
        emit Unlocked(msg.sender);
    }
    
    /**
     * @notice VULNERABILITY 6: Critical time logic
     */
    function isUnlocked() external view returns (bool) {
        // VULNERABLE: Do not use for critical logic
        return block.timestamp >= unlockTime;
    }
    
    receive() external payable {}
}

/**
 * @title MissingAccessControl
 * @notice Contract with functions without access control
 */
contract MissingAccessControl {
    address public owner;
    uint256 public price;
    bool public paused;
    
    mapping(address => uint256) public balances;
    
    constructor() {
        owner = msg.sender;
        price = 1 ether;
    }
    
    /**
     * @notice VULNERABILITY 7: Without access control
     */
    function setPrice(uint256 _price) external {
        // VULNERABLE: Anyone can change the price!
        price = _price;
    }
    
    /**
     * @notice VULNERABILITY 8: Without access control
     */
    function pause() external {
        // VULNERABLE: Anyone can pause!
        paused = true;
    }
    
    /**
     * @notice VULNERABILITY 9: Without access control
     */
    function unpause() external {
        // VULNERABLE: Anyone can unpause!
        paused = false;
    }
    
    /**
     * @notice VULNERABILITY 10: Without access control in mint
     */
    function mint(address _to, uint256 _amount) external {
        // VULNERABLE: Anyone can mint!
        balances[_to] += _amount;
    }
    
    /**
     * @notice VULNERABILITY 11: Ownership transfer without proper checks
     */
    function transferOwnership(address _newOwner) external {
        // VULNERABLE: Should check msg.sender == owner
        // VULNERABLE: Should check _newOwner != address(0)
        owner = _newOwner;
    }
    
    /**
     * @notice VULNERABILITY 12: Withdraw without access control
     */
    function withdraw() external {
        // VULNERABLE: Anyone can withdraw!
        payable(msg.sender).transfer(address(this).balance);
    }
    
    receive() external payable {}
}
