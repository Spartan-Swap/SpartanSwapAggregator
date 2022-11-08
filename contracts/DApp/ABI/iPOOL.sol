// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

interface iPOOL {
    function freeze() external view returns (bool);

    function genesis() external view returns (uint256);

    function lastStirred() external view returns (uint256);

    function baseAmount() external view returns (uint256);

    function tokenAmount() external view returns (uint256);

    function totalSupply() external view returns (uint256);

    function balanceOf(address) external view returns (uint256);

    function synthCap() external view returns (uint256);

    function baseCap() external view returns (uint256);

    function oldRate() external view returns (uint256);

    function stirRate() external view returns (uint256);
}
