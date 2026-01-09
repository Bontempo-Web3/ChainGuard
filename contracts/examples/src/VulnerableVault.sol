// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title VulnerableVault
 * @notice VULNERABLE CONTRACT - FOR DEMONSTRATION ONLY
 * @dev This contract contains intentional vulnerabilities to test the ChainGuard Scanner
 * 
 * INCLUDED VULNERABILITIES:
 * 1. Reentrancy Attack (CRITICAL)
 * 2. Missing Access Control (CRITICAL)
 * 3. Unchecked Return Values (MEDIUM)
 * 4. State Updates After External Calls (CRITICAL)
 */
contract VulnerableVault {
    mapping(address => uint256) public balances;
    address public owner;
    uint256 public totalDeposits;
    
    event Deposit(address indexed user, uint256 amount);
    event Withdrawal(address indexed user, uint256 amount);
    event EmergencyWithdraw(address indexed admin, uint256 amount);
    
    constructor() {
        owner = msg.sender;
    }
    
    /**
     * @notice Deposits ETH in the vault
     * @dev Public function for deposits
     */
    function deposit() external payable {
        require(msg.value > 0, "Must deposit something");
        balances[msg.sender] += msg.value;
        totalDeposits += msg.value;
        emit Deposit(msg.sender, msg.value);
    }
    
    /**
     * @notice Withdraws the user's entire balance
     * @dev VULNERABLE TO REENTRANCY ATTACK
     * 
     * PROBLEM: Balance is zeroed AFTER the external call
     * A malicious contract can call withdraw() again
     * before the balance is zeroed, draining the entire vault
     */
    function withdraw() external {
        uint256 amount = balances[msg.sender];
        require(amount > 0, "No balance to withdraw");
        
        // VULNERABILITY 1: External call BEFORE updating state
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");
        
        // VULNERABILITY 2: State updated AFTER the call
        balances[msg.sender] = 0;
        totalDeposits -= amount;
        
        emit Withdrawal(msg.sender, amount);
    }
    
    /**
     * @notice Withdraws a partial amount
     * @dev ALSO VULNERABLE TO REENTRANCY
     */
    function withdrawPartial(uint256 _amount) external {
        require(balances[msg.sender] >= _amount, "Insufficient balance");
        
        // Same reentrancy vulnerability
        (bool success, ) = msg.sender.call{value: _amount}("");
        require(success, "Transfer failed");
        
        balances[msg.sender] -= _amount;
        totalDeposits -= _amount;
        
        emit Withdrawal(msg.sender, _amount);
    }
    
    /**
     * @notice Emergency function to withdraw all funds
     * @dev MISSING ACCESS CONTROL - Anyone can call!
     * 
     * PROBLEM: There is no permission check
     * Any user can drain the entire contract
     */
    function emergencyWithdraw() external {
        // VULNERABILITY 3: No owner verification
        uint256 balance = address(this).balance;
        
        // VULNERABILITY 4: Unchecked return value
        payable(msg.sender).transfer(balance);
        
        emit EmergencyWithdraw(msg.sender, balance);
    }
    
    /**
     * @notice Transfers ownership
     * @dev ALSO WITHOUT ACCESS CONTROL
     */
    function transferOwnership(address newOwner) external {
        // VULNERABILITY 5: Anyone can change the owner
        require(newOwner != address(0), "Invalid address");
        owner = newOwner;
    }
    
    /**
     * @notice Returns the contract balance
     */
    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }
    
    /**
     * @notice Returns a user's balance
     */
    function getBalance(address user) external view returns (uint256) {
        return balances[user];
    }
    
    /**
     * @notice Allows receiving ETH directly
     */
    receive() external payable {
        balances[msg.sender] += msg.value;
        totalDeposits += msg.value;
        emit Deposit(msg.sender, msg.value);
    }
}
