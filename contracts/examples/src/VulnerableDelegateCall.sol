// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title VulnerableDelegateCall
 * @notice Contract with delegatecall vulnerabilities
 * @dev VULNERABILITIES:
 * 1. Delegatecall to untrusted contract
 * 2. Storage collision
 * 3. Selfdestruct via delegatecall
 */

/**
 * @title Library (Malicious)
 * @notice Library that can be used to attack via delegatecall
 */
contract MaliciousLibrary {
    address public owner;
    
    function setOwner(address _owner) external {
        owner = _owner;
    }
    
    function destroy() external {
        selfdestruct(payable(msg.sender));
    }
}

/**
 * @title VulnerableProxy
 * @notice Vulnerable proxy that allows delegatecall to any contract
 */
contract VulnerableProxy {
    address public owner;
    address public implementstion;
    
    event ImplementationUpdated(address newImplementation);
    event DelegateCallExecuted(address target, bytes data);
    
    constructor() {
        owner = msg.sender;
    }
    
    /**
     * @notice VULNERABILITY 1: Allows updating implementstion without access control
     */
    function setImplementation(address _implementstion) external {
        // VULNERABLE: Anyone can change the implementstion!
        implementstion = _implementstion;
        emit ImplementationUpdated(_implementstion);
    }
    
    /**
     * @notice VULNERABILITY 2: Delegatecall to untrusted address
     */
    function execute(address _target, bytes calldata _data) external payable returns (bytes memory) {
        // VULNERABLE: Allows delegatecall to any address!
        (bool success, bytes memory result) = _target.delegatecall(_data);
        require(success, "Delegatecall failed");
        
        emit DelegateCallExecuted(_target, _data);
        return result;
    }
    
    /**
     * @notice VULNERABILITY 3: Fallback with delegatecall
     */
    fallback() external payable {
        // VULNERABLE: Delegatecall without checks
        address _impl = implementstion;
        require(_impl != address(0), "No implementstion");
        
        assembly {
            calldatacopy(0, 0, calldatasize())
            let result := delegatecall(gas(), _impl, 0, calldatasize(), 0, 0)
            returndatacopy(0, 0, returndatasize())
            
            switch result
            case 0 { revert(0, returndatasize()) }
            default { return(0, returndatasize()) }
        }
    }
    
    receive() external payable {}
}

/**
 * @title VulnerableWallet
 * @notice Wallet with vulnerable delegatecall
 */
contract VulnerableWallet {
    address public owner;
    mapping(address => bool) public authorized;
    
    event Executed(address target, uint256 value, bytes data);
    
    constructor() {
        owner = msg.sender;
        authorized[msg.sender] = true;
    }
    
    /**
     * @notice VULNERABILITY 4: Delegatecall allows overwriting owner
     */
    function executeDelegate(address _target, bytes calldata _data) external payable {
        require(authorized[msg.sender], "Not authorized");
        
        // VULNERABLE: Delegatecall can modify storage (owner, authorized)
        (bool success, ) = _target.delegatecall(_data);
        require(success, "Execution failed");
        
        emit Executed(_target, msg.value, _data);
    }
    
    /**
     * @notice VULNERABILITY 5: Add authorized without verification
     */
    function addAuthorized(address _user) external {
        // VULNERABLE: Should have onlyOwner
        authorized[_user] = true;
    }
    
    /**
     * @notice Normal execution function (safer)
     */
    function execute(address _target, uint256 _value, bytes calldata _data) external {
        require(msg.sender == owner, "Only owner");
        
        (bool success, ) = _target.call{value: _value}(_data);
        require(success, "Call failed");
        
        emit Executed(_target, _value, _data);
    }
    
    receive() external payable {}
}

/**
 * @title StorageCollision
 * @notice Demonstrates storage collision vulnerability
 */
contract StorageCollision {
    // Slot 0
    address public owner;
    // Slot 1
    uint256 public value;
    
    constructor() {
        owner = msg.sender;
        value = 100;
    }
    
    /**
     * @notice VULNERABILITY 6: Delegatecall with different storage layout
     */
    function delegateSetValue(address _library, uint256 _newValue) external {
        // VULNERABLE: If _library has different layout, can overwrite owner!
        bytes memory data = abi.encodeWithSignature("setValue(uint256)", _newValue);
        (bool success, ) = _library.delegatecall(data);
        require(success, "Delegatecall failed");
    }
}

/**
 * @title BadLibrary
 * @notice Library with different storage layout (causes collision)
 */
contract BadLibrary {
    // Slot 0 - but here it's uint256, not address!
    uint256 public data;
    
    function setValue(uint256 _value) external {
        // This will overwrite slot 0 of the caller
        // If caller has address in slot 0, it will be overwritten!
        data = _value;
    }
}
