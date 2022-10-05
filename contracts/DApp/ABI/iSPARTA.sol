// SPDX-License-Identifier: MIT
pragma solidity ^0.8.3;

interface iSPARTA {
    function DAO() external view returns (address);
    function emitting() external view returns (bool);
    function totalSupply() external view returns (uint256);
    function secondsPerEra() external view returns (uint256);
    function balanceOf(address) external view returns (uint256);
}
