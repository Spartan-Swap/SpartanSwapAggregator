// SPDX-License-Identifier: MIT
pragma solidity ^0.8.3;

interface iSYNTHVAULT {
    function getMemberDeposit(address, address) external view returns (uint256);

    function depositForMember(address synth, address member) external;

    function setReserveClaim(uint256 _setSynthClaim) external;
}
