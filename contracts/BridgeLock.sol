// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract BridgeLock {
    IERC20 public immutable token;

    event Deposit(address indexed sender, uint256 amount);

    constructor(address tokenAddress) {
        token = IERC20(tokenAddress);
    }

    function deposit(uint256 amount) external {
        require(amount > 0, "Amount must be > 0");
        bool ok = token.transferFrom(msg.sender, address(this), amount);
        require(ok, "Transfer failed");
        emit Deposit(msg.sender, amount);
    }
}
