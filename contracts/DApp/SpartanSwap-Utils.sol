// SPDX-License-Identifier: MIT

/**
 * Included Multicall utility for broad/non-specific or dynamic/non-ABI multicall needs
 * To use, see: https://docs.openzeppelin.com/contracts/4.x/utilities#multicall
 */
import "@openzeppelin/contracts/utils/Multicall.sol";

/** Interfaces */
import "./ABI/iERC20.sol";
import "./ABI/iDAO.sol";
import "./ABI/iPOOL.sol";
import "./ABI/iPOOLFACTORY.sol";
import "./ABI/iRESERVE.sol";
import "./ABI/iSPARTA.sol";

pragma solidity ^0.8.3;

/** Utilities contract to batch and help reduce external RPC calls for the SpartanSwap DApp */
contract SpartanSwapUtils is Multicall {
    address public immutable SPARTA; // SPARTAv2 token contract address
    address public immutable WBNB; // WBNB token contract address
    address[] public stableCoinPools; // Array of stablecoin pool addresses WITH SUFFICIENT LIQUIDITY to derive internal pricing. Make sure this array is set in order of smallest to deepest

    struct GlobalDetails {
        bool emitting; // emitting (Store: Sparta.globalDetails)
        bool emissions; // emissions (Store: Reserve.globalDetails)
        bool globalFreeze; // globalFreeze (Store: Reserve.globalDetails)
        uint256 totalSupply; // totalSupply (Store: Sparta.globalDetails)
        uint256 secondsPerEra; // secondsPerEra (Store: Sparta.globalDetails)
        uint256 deadSupply; // deadSupply (Store: Sparta.globalDetails)
        uint256 spartaBalance; // spartaBalance (Store: Reserve.globalDetails)
    }

    struct TokenDetails {
        uint256 decimals; // token decimals
        uint256 balance; // user's balance (Store: Pool.tokenDetails)
        string symbol; // token symbol / ticker
    }

    struct PoolDetails {
        bool frozen; // Pool.freeze()
        uint256 genesis; // Pool.genesis() | can be packed into a smaller uint (timestamp)
        // uint256 lastStirred; // Pool.lastStirred() | can be packed into a smaller uint (timestamp) // dropping this will require changes in the dapp
        uint256 baseAmount; // Pool.baseAmount()
        uint256 tokenAmount; // Pool.tokenAmount()
        uint256 poolUnits; // Pool.totalSupply()
        // uint256 synthCap; // Pool.synthCap() // dropping this will require changes in the dapp
        uint256 baseCap; // Pool.baseCap()
        uint256 balance; // Pool.balanceOf(walletAddr)
        uint256 oldRate; // Pool.oldRate()
        // uint256 stirRate; // Pool.stirRate() // dropping this will require changes in the dapp
        address poolAddress; // PoolFactory.getPool()
    }

    constructor(address _spartaAddr, address _wbnb) {
        SPARTA = _spartaAddr;
        WBNB = _wbnb;
    }

    // function boolToInt(bool x) internal pure returns (uint256 r) {
    //     assembly {
    //         r := x // cast bool -> int
    //     }
    // }

    /** Contract Getters */

    function getDaoAddr() public view returns (address) {
        return iSPARTA(SPARTA).DAO(); // Call SPARTAv2 token contract for SPv2 DAO address
    }

    function getDaoInt() public view returns (iDAO) {
        return iDAO(getDaoAddr()); // Interface the SPv2 DAO address
    }

    function getPoolFactoryAddr() public view returns (address) {
        return getDaoInt().POOLFACTORY(); // Call SPv2 DAO contract for SPv2 PoolFactory address
    }

    function getPoolFactoryInt() public view returns (iPOOLFACTORY) {
        return iPOOLFACTORY(getPoolFactoryAddr()); //
    }

    function getReserveAddr() public view returns (address) {
        return getDaoInt().RESERVE(); //
    }

    function getReserveInt() public view returns (iRESERVE) {
        return iRESERVE(getReserveAddr()); //
    }

    /** PoolFactory Getters */

    function getListedTokens() external view returns (address[] memory) {
        // Returning the `address[] memory` is fine for current AMM design as the gas limit wont be reached
        // However V3 should utilize a `.length` and loop mappings to ensure scalability
        return getPoolFactoryInt().getTokenAssets();
    }

    function getCuratedPools() external view returns (address[] memory) {
        return getPoolFactoryInt().getVaultAssets();
    }

    function getGlobalDetails()
        external
        view
        returns (GlobalDetails[] memory returnData)
    {
        returnData = new GlobalDetails[](1);
        GlobalDetails memory global = returnData[0];
        global.emitting = iSPARTA(SPARTA).emitting();
        global.totalSupply = iSPARTA(SPARTA).totalSupply();
        global.secondsPerEra = iSPARTA(SPARTA).secondsPerEra();
        global.deadSupply = iSPARTA(SPARTA).balanceOf(
            0x000000000000000000000000000000000000dEaD
        );
        global.emissions = getReserveInt().emissions();
        global.spartaBalance = iSPARTA(SPARTA).balanceOf(getReserveAddr());
        global.globalFreeze = getReserveInt().globalFreeze();
    }

    function getTokenDetails(address userAddr, address[] calldata tokens)
        external
        view
        returns (TokenDetails[] memory returnData)
    {
        uint256 length = tokens.length;
        returnData = new TokenDetails[](length);
        for (uint256 i = 0; i < length; ) {
            TokenDetails memory token = returnData[i];
            if (tokens[i] == WBNB || tokens[i] == address(0)) {
                token.decimals = 18;
                token.symbol = 'WBNB';
            } else {
                token.decimals = iERC20(tokens[i]).decimals();
                token.symbol = iERC20(tokens[i]).symbol();
            }
            if (userAddr != address(0)) {
                if (tokens[i] == WBNB || tokens[i] == address(0)) {
                    token.balance = address(userAddr).balance;
                } else {
                    token.balance = iERC20(tokens[i]).balanceOf(userAddr);
                }
            }
            unchecked {
                ++i;
            }
        }
    }

    function getPoolDetails(address userAddr, address[] calldata tokens)
        external
        view
        returns (PoolDetails[] memory returnData)
    {
        uint256 length = tokens.length;
        returnData = new PoolDetails[](length);
        for (uint256 i = 0; i < length; ) {
            PoolDetails memory pool = returnData[i];
            address poolAddr = getPoolFactoryInt().getPool(tokens[i]);
            pool.poolAddress = poolAddr;
            pool.frozen = iPOOL(poolAddr).freeze();
            pool.genesis = iPOOL(poolAddr).genesis();
            // pool.lastStirred = iPOOL(poolAddr).lastStirred(); // dropping this will require changes in the dapp
            pool.baseAmount = iPOOL(poolAddr).baseAmount();
            pool.tokenAmount = iPOOL(poolAddr).tokenAmount();
            pool.poolUnits = iPOOL(poolAddr).totalSupply();
            // pool.synthCap = iPOOL(poolAddr).synthCap(); // dropping this will require changes in the dapp
            pool.baseCap = iPOOL(poolAddr).baseCap();
            if (userAddr != address(0)) {
                pool.balance = iPOOL(poolAddr).balanceOf(userAddr);
            }
            pool.oldRate = iPOOL(poolAddr).oldRate();
            // pool.stirRate = iPOOL(poolAddr).stirRate(); // dropping this will require changes in the dapp
            unchecked {
                ++i;
            }
        }
    }

    function getTotalSupply() public view returns (uint totalSupply) {
        totalSupply = iSPARTA(SPARTA).totalSupply();
        totalSupply = totalSupply - iSPARTA(SPARTA).balanceOf(0x000000000000000000000000000000000000dEaD);
    }

    function getCircSupply() external view returns (uint circSupply) {
        circSupply = getTotalSupply() - iSPARTA(SPARTA).balanceOf(getReserveAddr());
    }

    function getInternalPrice() external view returns (uint internalPrice) {
        address[] memory _stableCoinPools = stableCoinPools;
        internalPrice = iPOOL(_stableCoinPools[0]).tokenAmount() / iPOOL(_stableCoinPools[0]).baseAmount();
        for (uint256 i = 1; i < _stableCoinPools.length; ) {
            internalPrice = ((iPOOL(_stableCoinPools[i]).tokenAmount() / iPOOL(_stableCoinPools[i]).baseAmount()) + internalPrice) / 2;
            unchecked {
                ++i;
            }
        }
    }

    // Setters

    function setStablePoolArray(address[] memory stablePoolArray) external {
        stableCoinPools = stablePoolArray;
    }

}
