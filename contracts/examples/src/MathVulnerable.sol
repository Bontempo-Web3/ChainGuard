// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title MathVulnerable
 * @notice Contract with mathematical vulnerability that ONLY FUZZING detects
 * @dev The vulnerability is in a specific mathematical condition
 * that static analysis cannot predict
 */
contract MathVulnerable {
    mapping(address => uint256) public balances;
    uint256 public totalDeposits;
    
    event Deposited(address user, uint256 amount);
    event Withdrawn(address user, uint256 amount);
    
    /**
     * @notice Deposits ETH and calculates bonus
     * @dev VULNERABILITY: Overflow in bonus calculation with specific values
     */
    function deposit(uint256 multiplier) external payable {
        require(msg.value > 0, "Must deposit");
        require(multiplier > 0 && multiplier <= 10, "Invalid multiplier");
        
        // Bonus calculation - LOOKS SAFE
        // But with specific values it can overflow
        uint256 bonus = (msg.value * multiplier * 100) / 100;
        
        // If msg.value * multiplier * 100 > type(uint256).max
        // Example: msg.value = type(uint256).max / 500
        //          multiplier = 10
        //          msg.value * 10 * 100 = overflow!
        
        balances[msg.sender] += bonus;
        totalDeposits += bonus;
        
        emit Deposited(msg.sender, bonus);
    }
    
    /**
     * @notice Withdraws with proportional fee
     * @dev VULNERABILITY: Rounding can break invariant
     */
    function withdraw(uint256 amount) external {
        require(balances[msg.sender] >= amount, "Insufficient balance");
        
        // 3% fee
        uint256 fee = (amount * 3) / 100;
        uint256 netAmount = amount - fee;
        
        // SUBTLE VULNERABILITY:
        // If amount = 33, fee = 0 (rounding)
        // netAmount = 33
        // But should be 32.01
        
        balances[msg.sender] -= amount;
        totalDeposits -= amount;
        
        // Sends netAmount, but subtracts amount
        // With specific values, can drain more than it should
        payable(msg.sender).transfer(netAmount);
        
        emit Withdrawn(msg.sender, netAmount);
    }
    
    /**
     * @notice Calculates compound reward
     * @dev VULNERABILITY: Overflow in exponentiation
     */
    function calculateCompoundReward(uint256 principal, uint256 periods) 
        external 
        pure 
        returns (uint256) 
    {
        require(periods <= 100, "Too many periods");
        
        uint256 result = principal;
        
        // Compound interest: 10% per period
        // result = principal * (1.1)^periods
        for (uint256 i = 0; i < periods; i++) {
            // VULNERABILITY: Can overflow
            result = (result * 110) / 100;
        }
        
        // With large principal and many periods, overflow!
        // Example: principal = 2^200, periods = 50
        
        return result;
    }
    
    /**
     * @notice INVARIANT 1: totalDeposits must be >= sum of balances
     * @dev Echidna will try to break this
     */
    function echidna_total_deposits_invariant() public view returns (bool) {
        // This invariant CAN be broken with specific values
        // due to rounding in the withdraw function
        return totalDeposits >= balances[msg.sender];
    }
    
    /**
     * @notice INVARIANT 2: Balance must never be greater than totalDeposits
     */
    function echidna_balance_not_exceed_total() public view returns (bool) {
        return balances[msg.sender] <= totalDeposits;
    }
    
    /**
     * @notice INVARIANT 3: Contract must have sufficient ETH
     */
    function echidna_contract_has_funds() public view returns (bool) {
        // If totalDeposits > 0, contract must have ETH
        if (totalDeposits > 0) {
            return address(this).balance > 0;
        }
        return true;
    }
    
    receive() external payable {}
}

/**
 * @title PrecisionVulnerable
 * @notice Contract with precision loss that breaks invariants
 */
contract PrecisionVulnerable {
    uint256 public totalShares;
    uint256 public totalAssets;
    mapping(address => uint256) public shares;
    
    /**
     * @notice Deposits assets and receives shares
     * @dev VULNERABILITY: Precision loss in division
     */
    function deposit(uint256 assets) external {
        require(assets > 0, "Zero deposit");
        
        uint256 sharesToMint;
        
        if (totalShares == 0) {
            sharesToMint = assets;
        } else {
            // VULNERABILITY: Division before multiplication
            // Loses precision with specific values
            sharesToMint = (assets * totalShares) / totalAssets;
            
            // If assets = 1, totalShares = 1000, totalAssets = 10000
            // sharesToMint = (1 * 1000) / 10000 = 0 (rounding!)
            // User deposits 1 wei but receives 0 shares!
        }
        
        shares[msg.sender] += sharesToMint;
        totalShares += sharesToMint;
        totalAssets += assets;
    }
    
    /**
     * @notice Withdraws assets by burning shares
     */
    function withdraw(uint256 sharesToBurn) external {
        require(shares[msg.sender] >= sharesToBurn, "Insufficient shares");
        
        // VULNERABILITY: Same precision loss
        uint256 assetsToWithdraw = (sharesToBurn * totalAssets) / totalShares;
        
        shares[msg.sender] -= sharesToBurn;
        totalShares -= sharesToBurn;
        totalAssets -= assetsToWithdraw;
    }
    
    /**
     * @notice INVARIANT: If you have shares, you should be able to withdraw something
     * @dev Echidna can break this by depositing 1 wei
     */
    function echidna_shares_have_value() public view returns (bool) {
        if (shares[msg.sender] > 0 && totalAssets > 0) {
            uint256 value = (shares[msg.sender] * totalAssets) / totalShares;
            return value > 0;
        }
        return true;
    }
    
    /**
     * @notice INVARIANT: totalAssets >= totalShares (in theory)
     */
    function echidna_assets_backing() public view returns (bool) {
        // This can be broken with a specific sequence
        return totalAssets >= totalShares || totalShares == 0;
    }
}

/**
 * @title RoundingVulnerable  
 * @notice Demonstrates how rounding can be exploited
 */
contract RoundingVulnerable {
    mapping(address => uint256) public balances;
    
    /**
     * @notice Divides and distributes
     * @dev VULNERABILITY: Sum of results != input due to rounding
     */
    function distribute(address[] calldata recipients) external payable {
        require(recipients.length > 0, "No recipients");
        
        uint256 amountPerRecipient = msg.value / recipients.length;
        
        // VULNERABILITY: msg.value % recipients.length is lost!
        // Example: msg.value = 100, recipients = 3
        // amountPerRecipient = 33
        // Total distributed = 99, 1 wei lost!
        
        for (uint256 i = 0; i < recipients.length; i++) {
            balances[recipients[i]] += amountPerRecipient;
        }
    }
    
    /**
     * @notice INVARIANT: Sum of balances <= ETH received
     */
    function echidna_no_free_money() public view returns (bool) {
        // This should always pass
        return balances[msg.sender] <= address(this).balance;
    }
    
    receive() external payable {}
}
