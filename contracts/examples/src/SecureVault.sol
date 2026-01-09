// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title SecureVault
 * @notice SECURE CONTRACT - Fixed version of VulnerableVault
 * @dev This contract implements best practices for security
 * 
 * FIXES IMPLEMENTED:
 * 1. ReentrancyGuard to prevent reentrancy attacks
 * 2. Ownable for proper access control
 * 3. Checks-Effects-Interactions pattern
 * 4. Appropriate validations
 */
contract SecureVault is ReentrancyGuard, Ownable {
    mapping(address => uint256) public balances;
    uint256 public totalDeposits;
    
    event Deposit(address indexed user, uint256 amount);
    event Withdrawal(address indexed user, uint256 amount);
    event EmergencyWithdraw(address indexed admin, uint256 amount);
    
    constructor() Ownable(msg.sender) {}
    
    /**
     * @notice Deposits ETH into the vault
     * @dev Public function for deposits with validations
     */
    function deposit() external payable {
        require(msg.value > 0, "Must deposit something");
        
        balances[msg.sender] += msg.value;
        totalDeposits += msg.value;
        
        emit Deposit(msg.sender, msg.value);
    }
    
    /**
     * @notice Withdraws the entire balance of the user
     * @dev PROTECTED against reentrancy with nonReentrant modifier
     * Follows the Checks-Effects-Interactions pattern
     */
    function withdraw() external nonReentrant {
        uint256 amount = balances[msg.sender];
        require(amount > 0, "No balance to withdraw");
        
        // FIX 1: Update state BEFORE the external call
        balances[msg.sender] = 0;
        totalDeposits -= amount;
        
        // FIX 2: External call last (Interactions)
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");
        
        emit Withdrawal(msg.sender, amount);
    }
    
    /**
     * @notice Withdraws a partial amount
     * @dev PROTECTED against reentrancy
     */
    function withdrawPartial(uint256 _amount) external nonReentrant {
        require(_amount > 0, "Amount must be greater than 0");
        require(balances[msg.sender] >= _amount, "Insufficient balance");
        
        // Checks-Effects-Interactions pattern
        balances[msg.sender] -= _amount;
        totalDeposits -= _amount;
        
        (bool success, ) = msg.sender.call{value: _amount}("");
        require(success, "Transfer failed");
        
        emit Withdrawal(msg.sender, _amount);
    }
    
    /**
     * @notice Emergency function to withdraw all funds
     * @dev PROTECTED with onlyOwner modifier
     * Only the owner can call this function
     */
    function emergencyWithdraw() external onlyOwner nonReentrant {
        uint256 balance = address(this).balance;
        require(balance > 0, "No balance to withdraw");
        
        // FIX 3: Only owner can execute
        (bool success, ) = msg.sender.call{value: balance}("");
        require(success, "Transfer failed");
        
        emit EmergencyWithdraw(msg.sender, balance);
    }
    
    /**
     * @notice Pauses deposits in case of emergency
     * @dev Additional security feature
     */
    bool public depositsPaused;
    
    function pauseDeposits() external onlyOwner {
        depositsPaused = true;
    }
    
    function unpauseDeposits() external onlyOwner {
        depositsPaused = false;
    }
    
    /**
     * @notice Deposits with pause verification
     */
    function depositSafe() external payable {
        require(!depositsPaused, "Deposits are paused");
        require(msg.value > 0, "Must deposit something");
        
        balances[msg.sender] += msg.value;
        totalDeposits += msg.value;
        
        emit Deposit(msg.sender, msg.value);
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
        require(!depositsPaused, "Deposits are paused");
        
        balances[msg.sender] += msg.value;
        totalDeposits += msg.value;
        
        emit Deposit(msg.sender, msg.value);
    }
}
