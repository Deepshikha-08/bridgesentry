// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract WrappedToken is ERC20 {
    address public minter;

    constructor() ERC20("Wrapped Test Token", "wTOK") {}

    function setMinter(address newMinter) external {
        require(minter == address(0), "Minter already set");
        minter = newMinter;
    }

    function mint(address to, uint256 amount) external {
        require(msg.sender == minter, "Only minter");
        _mint(to, amount);
    }
}
