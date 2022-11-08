// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

interface iRESERVE {
    function emissions() external view returns (bool);

    function globalFreeze() external view returns (bool);

    function freezeTime() external view returns (uint256);

    function polPoolAddress() external view returns (address);
}
