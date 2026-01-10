// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title VulnerableToken
 * @notice ERC20 token with multiple vulnerabilities
 * @dev VULNERABILITIES:
 * 1. Integer Overflow/Underflow (without SafeMath in older versions)
 * 2. Unchecked external calls
 * 3. Missing return value check
 * 4. No access control in critical functions
 */
contract VulnerableToken {
    string public name = "Vulnerable Token";
    string public symbol = "VULN";
    uint8 public decimals = 18;
    uint256 public totalSupply;
    
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    
    constructor(uint256 _initialSupply) {
        totalSupply = _initialSupply;
        balanceOf[msg.sender] = _initialSupply;
    }
    
    /**
     * @notice VULNERABILITY 1: No overflow verification
     * @dev In Solidity 0.8+, overflow is checked automatically,
     * but this code uses unchecked to demonstrate the vulnerability
     */
    function mint(address _to, uint256 _amount) external {
        // VULNERABLE: Anyone can mint tokens!
        unchecked {
            totalSupply += _amount; // Can overflow
            balanceOf[_to] += _amount; // Can overflow
        }
        emit Transfer(address(0), _to, _amount);
    }
    
    /**
     * @notice VULNERABILITY 2: No underflow verification
     */
    function burn(uint256 _amount) external {
        unchecked {
            balanceOf[msg.sender] -= _amount; // Can underflow
            totalSupply -= _amount; // Can underflow
        }
        emit Transfer(msg.sender, address(0), _amount);
    }
    
    /**
     * @notice VULNERABILITY 3: Transfer without proper checks
     */
    function transfer(address _to, uint256 _value) external returns (bool) {
        // VULNERABLE: Does not check if _to is address(0)
        // VULNERABLE: Does not check if sender has enough balance
        unchecked {
            balanceOf[msg.sender] -= _value;
            balanceOf[_to] += _value;
        }
        emit Transfer(msg.sender, _to, _value);
        return true;
    }
    
    /**
     * @notice VULNERABILITY 4: Approve without checks
     */
    function approve(address _spender, uint256 _value) external returns (bool) {
        // VULNERABLE: Does not check race condition (approve front-running)
        allowance[msg.sender][_spender] = _value;
        emit Approval(msg.sender, _spender, _value);
        return true;
    }
    
    /**
     * @notice VULNERABILITY 5: transferFrom without proper checks
     */
    function transferFrom(address _from, address _to, uint256 _value) external returns (bool) {
        // VULNERABLE: Does not check allowance properly
        unchecked {
            allowance[_from][msg.sender] -= _value;
            balanceOf[_from] -= _value;
            balanceOf[_to] += _value;
        }
        emit Transfer(_from, _to, _value);
        return true;
    }
    
    /**
     * @notice VULNERABILITY 6: Airdrop function with unbounded loop
     * @dev Can cause DoS due to gas limit
     */
    function airdrop(address[] calldata _recipients, uint256 _amount) external {
        // VULNERABLE: Unbounded loop can cause out-of-gas
        for (uint256 i = 0; i < _recipients.length; i++) {
            unchecked {
                balanceOf[msg.sender] -= _amount;
                balanceOf[_recipients[i]] += _amount;
            }
            emit Transfer(msg.sender, _recipients[i], _amount);
        }
    }
    
    /**
     * @notice VULNERABILITY 7: Rescue function without access control
     */
    function rescueTokens(address _token, uint256 _amount) external {
        // VULNERABLE: Anyone can rescue tokens!
        (bool success, ) = _token.call(
            abi.encodeWithSignature("transfer(address,uint256)", msg.sender, _amount)
        );
        // VULNERABLE: Does not check the return of the call
        // success is not used
    }
    
    /**
     * @notice VULNERABILITY 8: Receives ETH without a withdraw function
     */
    receive() external payable {
        // VULNERABLE: ETH gets stuck in the contract
        // There is no function to withdraw
    }
}
