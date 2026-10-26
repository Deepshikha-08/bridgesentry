// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

interface IWrappedToken {
    function mint(address to, uint256 amount) external;
}

contract BridgeMint {
    IWrappedToken public immutable wrapped;
    address public immutable relayer;

    event Minted(address indexed to, uint256 amount);

    constructor(address wrappedAddress, address relayerAddress) {
        wrapped = IWrappedToken(wrappedAddress);
        relayer = relayerAddress;
    }

    function mintWithSignature(
        address to,
        uint256 amount,
        bytes calldata signature
    ) external {
        bytes32 messageHash = keccak256(abi.encodePacked(to, amount));
        bytes32 ethHash = MessageHashUtils.toEthSignedMessageHash(messageHash);
        address signer = ECDSA.recover(ethHash, signature);
        require(signer == relayer, "Invalid relayer signature");

        wrapped.mint(to, amount);
        emit Minted(to, amount);
    }
}
