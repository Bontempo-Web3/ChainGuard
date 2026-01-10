// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title FuzzOnlyVulnerable
 * @notice Contract with vulnerabilities that ONLY FUZZING detects
 * @dev Static analysis cannot detect them because:
 * 1. They depend on specific input values
 * 2. They require a specific sequence of operations
 * 3. They involve complex mathematical conditions
 */
contract FuzzOnlyVulnerable {
    mapping(address => uint256) public balances;
    uint256 public totalSupply;
    uint256 public constant MAX_SUPPLY = 1000000 * 10**18;
    
    event Deposited(address user, uint256 amount);
    event Withdrawn(address user, uint256 amount);
    event Minted(address user, uint256 amount);
    
    /**
     * @notice VULNERABILITY 1: Integer overflow in a specific condition
     * @dev Only happens when amount * 2 > type(uint256).max
     * Static analysis does not detect it because the operation looks safe
     */
    function deposit() external payable {
        require(msg.value > 0, "Must deposit something");
        
        // Looks safe, but...
        uint256 bonus = msg.value * 2; // VULNERABLE: can overflow!
        
        // If msg.value > type(uint256).max / 2, bonus will wrap around
        // Example: msg.value = 2^255 + 1
        // bonus = (2^255 + 1) * 2 = overflow to 2
        
        balances[msg.sender] += bonus;
        totalSupply += bonus;
        
        emit Deposited(msg.sender, bonus);
    }
    
    /**
     * @notice VULNERABILITY 2: Underflow in a specific sequence
     * @dev Only happens with the sequence: small deposit -> large withdraw
     */
    function withdraw(uint256 _amount) external {
        require(balances[msg.sender] >= _amount, "Insufficient balance");
        
        // Parece seguro, mas...
        uint256 fee = _amount / 100; // 1% fee
        uint256 netAmount = _amount - fee; // VULNERABLE in edge case!
        
        // If _amount = 1, fee = 0, netAmount = 1
        // But with weird rounding...
        
        balances[msg.sender] -= _amount;
        totalSupply -= _amount;
        
        payable(msg.sender).transfer(netAmount);
        
        emit Withdrawn(msg.sender, netAmount);
    }
    
    /**
     * @notice VULNERABILITY 3: Complex mathematical condition
     * @dev Only fails with specific values that break the invariant
     */
    function mint(uint256 _amount) external {
        // Appears to have proper checks
        require(totalSupply + _amount <= MAX_SUPPLY, "Exceeds max supply");
        
        // But this check can be bypassed!
        // If _amount becomes negative (wrap around), it passes the check
        
        balances[msg.sender] += _amount;
        totalSupply += _amount; // VULNERABLE: can exceed MAX_SUPPLY!
        
        emit Minted(msg.sender, _amount);
    }
    
    /**
     * @notice VULNERABILITY 4: Race condition with specific values
     * @dev Requires sequence: transfer -> transfer with specific values
     */
    function transfer(address _to, uint256 _amount) external {
        require(balances[msg.sender] >= _amount, "Insufficient balance");
        require(_to != address(0), "Invalid recipient");
        
        // Parece seguro, mas...
        uint256 senderBalance = balances[msg.sender];
        uint256 recipientBalance = balances[_to];
        
        // If sender == recipient and _amount is specific, can break invariant
        balances[msg.sender] = senderBalance - _amount;
        balances[_to] = recipientBalance + _amount;
        
        // VULNERABLE: If _to == msg.sender, balance can become inconsistent
        // with specific values of _amount
    }
    
    /**
     * @notice VULNERABILITY 5: Division by zero in edge case
     * @dev Only happens when totalSupply == 0 after specific operations
     */
    function calculateShare(uint256 _amount) external view returns (uint256) {
        // Appears to have protection
        if (totalSupply == 0) return 0;
        
        // But can cause division by zero at runtime with specific sequence
        uint256 share = (_amount * 1000) / totalSupply;
        
        return share;
    }
    
    /**
     * @notice VULNERABILITY 6: Overflow in multiplication before division
     * @dev Only happens with large specific values
     */
    function calculateReward(uint256 _balance, uint256 _rate) external pure returns (uint256) {
        // Looks safe (division afterwards)
        // But _balance * _rate can overflow before the division!
        
        uint256 reward = (_balance * _rate) / 10000; // VULNERABLE!
        
        // If _balance = 2^200 and _rate = 2^100, overflow before division
        
        return reward;
    }
    
    /**
     * @notice VULNERABILITY 7: Invariant broken with specific sequence
     * @dev totalSupply must always == sum of all balances
     * But it can be broken with a specific sequence of operations
     */
    function batchTransfer(address[] calldata _recipients, uint256[] calldata _amounts) external {
        require(_recipients.length == _amounts.length, "Length mismatch");
        
        uint256 totalAmount = 0;
        for (uint256 i = 0; i < _amounts.length; i++) {
            totalAmount += _amounts[i]; // Can overflow!
        }
        
        require(balances[msg.sender] >= totalAmount, "Insufficient balance");
        
        balances[msg.sender] -= totalAmount;
        
        for (uint256 i = 0; i < _recipients.length; i++) {
            balances[_recipients[i]] += _amounts[i];
        }
        
        // VULNERABLE: If totalAmount overflowed, invariant is broken
        // totalSupply does not change, but sum of balances does!
    }
    
    /**
     * @notice VULNERABILITY 8: Subtle reentrancy with specific values
     * @dev Only exploitable with values that cause specific behavior
     */
    function complexWithdraw(uint256 _amount, address _callback) external {
        require(balances[msg.sender] >= _amount, "Insufficient balance");
        
        uint256 fee = (_amount * 5) / 100; // 5% fee
        uint256 netAmount = _amount - fee;
        
        // Callback before updating state (reentrancy)
        if (_callback != address(0)) {
            (bool success, ) = _callback.call(
                abi.encodeWithSignature("onWithdraw(uint256)", netAmount)
            );
            require(success, "Callback failed");
        }
        
        // VULNERABLE: State updated afterwards
        // But only exploitable with specific values of _amount
        // that make fee == 0 or a specific netAmount
        balances[msg.sender] -= _amount;
        
        payable(msg.sender).transfer(netAmount);
    }
    
    /**
     * @notice Invariant: totalSupply == sum of all balances
     * @dev Echidna can test this automatically
     */
    function echidna_total_supply_invariant() public view returns (bool) {
        // This invariant should always be true
        // Echidna will try to break this
        return totalSupply <= MAX_SUPPLY;
    }
    
    /**
     * @notice Invariant: No individual balance > totalSupply
     */
    function echidna_balance_invariant() public view returns (bool) {
        // Echidna will try to make balances[user] > totalSupply
        return balances[msg.sender] <= totalSupply;
    }
    
    receive() external payable {}
}

/**
 * @title AttackerContract
 * @notice Contract to exploit the vulnerabilities via fuzzing
 */
contract AttackerContract {
    FuzzOnlyVulnerable public target;
    
    constructor(address _target) {
        target = FuzzOnlyVulnerable(payable(_target));
    }
    
    function attack() external payable {
        // Echidna will discover specific values that break the contract
        target.deposit{value: msg.value}();
    }
    
    function onWithdraw(uint256 _amount) external {
        // Callback for reentrancy
        if (address(target).balance > 0) {
            target.complexWithdraw(_amount, address(0));
        }
    }
    
    receive() external payable {}
}
