// SPDX-License-Identifier: MIT
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/** Interfaces */
import "@openzeppelin/contracts/token/ERC20/IERC20.sol"; // IERC20
import "./ABI/iWrappedNative.sol";
// If known at compile, import ABIs here and we can use normal high level named-function calls.
// If interface not known at compile (i.e. we need to add in a new AMM route without redeploying contracts):
// use low level call() function.

pragma solidity 0.8.16;

contract SpartanSwapAggregator {
    /** Extensions */
    using SafeERC20 for IERC20;

    /** Vars */
    address private immutable wrappedAddr; // Address of wrapped version of the chain's native token (i.e. WETH <> ETH || WBNB <> BNB)

    /** Mappings */

    /** Structs */

    /** Constructor */
    constructor(address _wrappedAddr) {
        wrappedAddr = _wrappedAddr;
    }

    /** Read-only Functions */
    function isNative(IERC20 token) internal view returns (bool) {
        return (token == IERC20(address(0)) || token == IERC20(wrappedAddr));
    }

    /** Write Functions */
    receive() external payable {}

    function swap(
        address inputToken,
        address outputToken,
        uint256 inputAmount,
        uint256 minOutputAmount,
        address receiver
    ) external payable returns (uint256 outputAmount) {
        require(minOutputAmount > 0, "minOutputAmount not set"); // Consider removing this line (sanity check, maybe not required)

        IERC20 _inputToken = IERC20(inputToken); // Interfaced input token

        tsfUserToRouter(_inputToken, inputAmount); // Transfer in tokens | user -> router (handles wrapping)

        // TODO: execute the external swap/s using low level call() function | router -> contract/s -> router

        IERC20 _outputToken = IERC20(outputToken); // Interfaced output token

        outputAmount = _outputToken.balanceOf(address(this)); // Get router balance of wrapped tokens

        uint256 combinedAmount = outputAmount;
        if (isNative(_outputToken)) {
            combinedAmount += address(this).balance;
        }
        require(combinedAmount >= minOutputAmount, "Output amount too low");

        tsfRouterToUser(_outputToken, outputAmount, receiver); // Safe tsf out to user | router -> user (handles unwrapping)
    }

    function safeTransferNative(address to, uint256 value) internal {
        (bool success, ) = to.call{value: value}(new bytes(0));
        require(success, "safeTransferNative: Transfer failed");
    }

    // Handle transfer of input asset into the router & wrapping
    function tsfUserToRouter(IERC20 token, uint256 inputAmount) internal {
        if (isNative(token)) {
            require((inputAmount == msg.value)); // Amount must be == msg.value
            iWrappedNative(wrappedAddr).deposit{value: inputAmount}(); // UnwrappedNative from User -> Wrapped -> Router
            // safeTransferNative(wrappedAddr, value); // <-- Alternatively we can just send to Wrapped address if its receive() uses deposit() fallback
        } else {
            token.safeTransferFrom(msg.sender, address(this), inputAmount); // ERC20 from User -> Router
        }
    }

    function tsfRouterToUser(
        IERC20 token,
        uint256 outputAmount,
        address receiver
    ) internal {
        if (isNative(token)) {
            iWrappedNative(wrappedAddr).withdraw(outputAmount); // WrappedNative from Router -> UnWrapped -> Router
            safeTransferNative(receiver, address(this).balance); // UnwrappedNative from Router -> User
            // Use address(this).balance to ensure handling AMMs that send unwrapped native assets to router
        } else {
            token.safeTransferFrom(address(this), receiver, outputAmount); // ERC20 from Router -> User
        }
    }
}
