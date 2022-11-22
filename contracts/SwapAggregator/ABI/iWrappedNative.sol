// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.16;

interface iWrappedNative {
    function deposit() external payable;

    function withdraw(uint256) external;
}
