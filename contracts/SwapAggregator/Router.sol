// SPDX-License-Identifier: MIT

/** Interfaces */
import "@openzeppelin/contracts/token/ERC20/IERC20.sol"; // IERC20
// If known at comile, import ABIs here and we can use normal high level named-function calls.
// If interface not known at compile (i.e. we need to add in a new AMM route without redeploying contracts):
// use low level call() function.

pragma solidity 0.8.16;

contract SpartanSwapAggregator {
    /** Vars */

    /** Mappings */

    /** Structs */

    /** Read-only Functions */

    /** Write Functions */
    function swap(
        address inputToken,
        address outputToken,
        uint256 inputAmount,
        uint256 minOutputAmount,
        address receiver
    ) external payable returns (uint256 outputAmount) {
        require(minOutputAmount > 0, "minOutputAmount not set"); // Consider removing this line (sanity check, maybe not required)

        IERC20 _inputToken = IERC20(inputToken); // Interfaced input token

        // Transfer in tokens | user -> router

        // check if input is native gas token, handle logic and wrapping accordingly

        // execute the external swap/s using low level call() function | router -> contract/s -> router
        
        IERC20 _outputToken = IERC20(outputToken); // Interfaced output token

        // Get router balance of tokens

        // check if output is native gas token, handle logic and wrapping/unwrapping accordingly

        // Get total balance (output amount)
        require(outputAmount >= minOutputAmount, "Output amount too low");
        // Safe tsf out to receiver | router -> user
    }
}
