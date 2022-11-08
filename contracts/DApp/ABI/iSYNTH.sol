// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

interface iSYNTH {
    function genesis() external view returns (uint);

    function TOKEN() external view returns (address);

    function POOL() external view returns (address);

    function collateral() external view returns (uint256);

    function totalSupply() external view returns (uint256);

    function balanceOf(address) external view returns (uint256);

    function mintSynth(address, uint) external returns (uint256);

    function burnSynth(uint) external returns (uint);

    function realise() external;

}
