// SPDX-License-Identifier: MIT

/** Interfaces */
import "./ABI/iERC20.sol";
import "./ABI/iDAO.sol";
import "./ABI/iPOOL.sol";
import "./ABI/iPOOLFACTORY.sol";
import "./ABI/iRESERVE.sol";
import "./ABI/iSPARTA.sol";
import "./ABI/iSYNTHFACTORY.sol";
import "./ABI/iSYNTH.sol";
import "./ABI/iSYNTHVAULT.sol";
import "./ABI/iBONDVAULT.sol";
import "./ABI/iDAOVAULT.sol";

pragma solidity ^0.8.3;

/** Utilities contract to batch and help reduce external RPC calls for the SpartanSwap DApp */
contract SpartanSwapUtils {
    address public immutable SPARTA; // SPARTAv2 token contract address
    address public immutable WBNB; // WBNB token contract address
    address[] public stableCoinPools; // Array of stablecoin pool addresses WITH SUFFICIENT LIQUIDITY to derive internal pricing. Make sure this array is set in order of smallest to deepest
    address[] public reserveHeldPools; // Array of pool addresses that the reserve holds LPs of
    address[] public bondedPools; // Array of pool addresses that were enabled for BondV2

    struct GlobalDetails {
        bool emitting; // emitting (Store: Sparta.globalDetails)
        bool emissions; // emissions (Store: Reserve.globalDetails)
        bool globalFreeze; // globalFreeze (Store: Reserve.globalDetails)
        uint256 totalSupply; // totalSupply (Store: Sparta.globalDetails)
        uint256 secondsPerEra; // secondsPerEra (Store: Sparta.globalDetails)
        uint256 deadSupply; // deadSupply (Store: Sparta.globalDetails)
        uint256 spartaBalance; // spartaBalance (Store: Reserve.globalDetails)
    }

    struct DaoGlobalDetails {
        bool running; // Dao.running()
        uint256 coolOffPeriod; // Dao.coolOffPeriod()
        uint256 erasToEarn; // Dao.erasToEarn()
        uint256 daoClaim; // Dao.daoClaim()
        uint256 daoFee; // Dao.daoFee()
        uint256 currentProposal; // Dao.currentProposal()
        uint256 cancelPeriod; // Dao.cancelPeriod()
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
        uint256 totalSupply; // Pool.totalSupply()
        // uint256 synthCap; // Pool.synthCap() // dropping this will require changes in the dapp
        uint256 baseCap; // Pool.baseCap()
        uint256 balance; // Pool.balanceOf(walletAddr)
        uint256 oldRate; // Pool.oldRate()
        // uint256 stirRate; // Pool.stirRate() // dropping this will require changes in the dapp
        address poolAddress; // PoolFactory.getPool()
    }

    struct ReserveDetails {
        address poolAddress; // PoolFactory.getPool()
        uint256 poolTotalSupply; // Pool.totalSupply()
        uint256 poolBaseAmount; // Pool.baseAmount() 
        uint256 poolTokenAmount; // Pool.tokenAmount() 
        uint256 resBalance; // Pool.balanceOf(Reserve)
        uint256 resSparta; // 
        uint256 resTokens; // 
    }

    struct SynthDetails {
        address synthAddress; // SynthFactory.getSynth(tokenAddr)
        uint256 balance; // Synth.balanceOf(walletAddr)
        uint256 staked; // SynthVault.getMemberDeposit(walletAddr, synthAddress)
        uint256 collateral; // Synth.collateral()
        uint256 totalSupply; // Synth.totalSupply()
    }

    struct BondDetails {
        address poolAddress; // 
        uint256 bondedTotal; // BondVault.mapTotalPool_balance[curatedPoolAddress[i]]
        uint256 bondedMember; // BondVault.mapBondedAmount_memberDetails[_pool].bondedLP[member]
        uint256 lastBlockTime; // BondVault.mapBondedAmount_memberDetails[_pool].lastBlockTime[member]
        uint256 claimRate; // 
        bool isMember; // BondVault.mapBondedAmount_memberDetails[_pool].isAssetMember[member]
    }

    struct DaoDetails {
        address poolAddress; // 
        uint256 staked; // Dao.staked - DaoVault.getMemberPoolBalance()
        uint256 globalStaked; // Dao.globalStaked - DaoVault.mapTotalPool_balance()
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

    function getSynthFactoryAddr() public view returns (address) {
        return getDaoInt().SYNTHFACTORY(); //
    }

    function getSynthFactoryInt() public view returns (iSYNTHFACTORY) {
        return iSYNTHFACTORY(getSynthFactoryAddr()); //
    }

    function getSynthVaultAddr() public view returns (address) {
        return getDaoInt().SYNTHVAULT(); //
    }

    function getSynthVaultInt() public view returns (iSYNTHVAULT) {
        return iSYNTHVAULT(getSynthVaultAddr()); //
    }

    function getBondVaultAddr() public view returns (address) {
        return getDaoInt().BONDVAULT(); //
    }

    function getBondVaultInt() public view returns (iBONDVAULT) {
        return iBONDVAULT(getBondVaultAddr()); //
    }

    function getDaoVaultAddr() public view returns (address) {
        return getDaoInt().DAOVAULT(); //
    }

    function getDaoVaultInt() public view returns (iDAOVAULT) {
        return iDAOVAULT(getDaoVaultAddr()); //
    }

    /** PoolFactory Getters */

    function getListedTokens() external view returns (address[] memory) {
        // Returning the `address[] memory` is fine for current AMM design as the gas limit wont be reached
        // However V3 should utilize a `.length` and loop mappings to ensure scalability
        return getPoolFactoryInt().getTokenAssets();
    }

    function getListedPools() public view returns (address[] memory) {
        // Returning the `address[] memory` is fine for current AMM design as the gas limit wont be reached
        // However V3 should utilize a `.length` and loop mappings to ensure scalability
        return getPoolFactoryInt().getPoolAssets();
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

    
    function getDaoGlobalDetails() external view returns (DaoGlobalDetails[] memory returnData) {
        returnData = new DaoGlobalDetails[](1);
        DaoGlobalDetails memory daoGlobal = returnData[0];
        daoGlobal.running = getDaoInt().running();
        daoGlobal.coolOffPeriod = getDaoInt().coolOffPeriod();
        daoGlobal.erasToEarn = getDaoInt().erasToEarn();
        daoGlobal.daoClaim = getDaoInt().daoClaim();
        daoGlobal.daoFee = getDaoInt().daoFee();
        daoGlobal.currentProposal = getDaoInt().currentProposal();
        daoGlobal.cancelPeriod = getDaoInt().cancelPeriod();
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
            unchecked {++i;}
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
            pool.totalSupply = iPOOL(poolAddr).totalSupply();
            // pool.synthCap = iPOOL(poolAddr).synthCap(); // dropping this will require changes in the dapp
            pool.baseCap = iPOOL(poolAddr).baseCap();
            if (userAddr != address(0)) {
                pool.balance = iPOOL(poolAddr).balanceOf(userAddr);
            }
            pool.oldRate = iPOOL(poolAddr).oldRate();
            // pool.stirRate = iPOOL(poolAddr).stirRate(); // dropping this will require changes in the dapp
            unchecked {++i;}
        }
    }

    function getReserveHoldings() public view returns (ReserveDetails[] memory returnData) {
        address[] memory reservePools = reserveHeldPools;
        uint256 length = reservePools.length;
        returnData = new ReserveDetails[](length);
        for (uint256 i = 0; i < length; ) {
            ReserveDetails memory resPool = returnData[i];
            resPool.poolAddress = reservePools[i];
            uint resBalance = iPOOL(reservePools[i]).balanceOf(getReserveAddr());
            uint poolTotalSupply = iPOOL(reservePools[i]).totalSupply();
            uint poolBaseAmount = iPOOL(reservePools[i]).baseAmount();
            uint poolTokenAmount = iPOOL(reservePools[i]).tokenAmount();
            resPool.poolTotalSupply = poolTotalSupply;
            resPool.poolBaseAmount = poolBaseAmount;
            resPool.poolTokenAmount = poolTokenAmount;
            resPool.resBalance = resBalance;
            resPool.resSparta = (poolBaseAmount * resBalance) / poolTotalSupply;
            resPool.resTokens = (poolTokenAmount * resBalance) / poolTotalSupply;
            unchecked {++i;}
        }
    }

    function getSynthDetails(address userAddr, address[] calldata tokens)
        external
        view
        returns (SynthDetails[] memory returnData)
    {
        uint256 length = tokens.length;
        returnData = new SynthDetails[](length);
        for (uint256 i = 0; i < length; ) {
            SynthDetails memory synth = returnData[i];
            address synthAddr = getSynthFactoryInt().getSynth(tokens[i]);
            synth.synthAddress = synthAddr;
            synth.collateral = iSYNTH(synthAddr).collateral();
            synth.totalSupply = iSYNTH(synthAddr).totalSupply();
            if (userAddr != address(0)) {
                synth.balance = iSYNTH(synthAddr).balanceOf(userAddr);
                synth.staked = getSynthVaultInt().getMemberDeposit(userAddr, synthAddr);
            }
            unchecked {++i;}
        }
    }

    function getBondDetails(address userAddr)
        external
        view
        returns (BondDetails[] memory returnData)
    {
        address[] memory _bondedPools = bondedPools;
        uint256 length = _bondedPools.length;
        returnData = new BondDetails[](length);
        for (uint256 i = 0; i < length; ) {
            BondDetails memory bond = returnData[i];
            bond.poolAddress = _bondedPools[i];
            bond.bondedTotal = getBondVaultInt().mapTotalPool_balance(_bondedPools[i]);
            if (userAddr != address(0)) {
                (bool isMember, uint256 bondedMember, uint256 claimRate, uint256 lastBlockTime) = getBondVaultInt().getMemberDetails(userAddr, _bondedPools[i]);
                bond.isMember = isMember;
                bond.bondedMember = bondedMember;
                bond.claimRate = claimRate;
                bond.lastBlockTime = lastBlockTime;
            }
            unchecked {++i;}
        }
    }

    function getDaoDetails(address userAddr, address[] calldata pools)
        external
        view
        returns (DaoDetails[] memory returnData)
    {
        uint256 length = pools.length;
        returnData = new DaoDetails[](length);
        for (uint256 i = 0; i < length; ) {
            DaoDetails memory dao = returnData[i];
            dao.poolAddress = pools[i];
            dao.globalStaked = getDaoVaultInt().mapTotalPool_balance(pools[i]);
            if (userAddr != address(0)) {
                dao.staked = getDaoVaultInt().getMemberPoolBalance(pools[i], userAddr);
            }
            unchecked {++i;}
        }
    }

    function getTotalSupply() public view returns (uint totalSupply) {
        totalSupply = iSPARTA(SPARTA).totalSupply();
        totalSupply = totalSupply - iSPARTA(SPARTA).balanceOf(0x000000000000000000000000000000000000dEaD);
    }

    function getCircSupply() external view returns (uint circSupply) {
        circSupply = getTotalSupply() - iSPARTA(SPARTA).balanceOf(getReserveAddr());
        ReserveDetails[] memory resHoldings = getReserveHoldings();
        for (uint256 i = 0; i < resHoldings.length; ) {
            circSupply = circSupply - resHoldings[i].resSparta;
            unchecked {++i;}
        }
    }

    function getInternalPrice() public view returns (uint internalPrice) {
        address[] memory _stableCoinPools = stableCoinPools;
        require(_stableCoinPools.length > 0, 'Stablecoin array has not been set');
        internalPrice = (iPOOL(_stableCoinPools[0]).tokenAmount() * 10**18) / iPOOL(_stableCoinPools[0]).baseAmount();
        for (uint256 i = 1; i < _stableCoinPools.length; ) {
            internalPrice = ((iPOOL(_stableCoinPools[i]).tokenAmount() * 10**18 / iPOOL(_stableCoinPools[i]).baseAmount()) + internalPrice) / 2;
            unchecked {++i;}
        }
    }

    function getTVLUnbounded() public view returns (uint tvlSPARTA) {
        address[] memory poolAddresses = getListedPools();
        for (uint256 i = 0; i < poolAddresses.length; ) {
            tvlSPARTA = tvlSPARTA + iSPARTA(SPARTA).balanceOf(poolAddresses[i]);
            unchecked {++i;}
        }
        tvlSPARTA = tvlSPARTA * 2;
    }

    function getTVL(address[] calldata poolAddresses) external view returns (uint tvlSPARTA) {
        for (uint256 i = 0; i < poolAddresses.length; ) {
            tvlSPARTA = tvlSPARTA + iSPARTA(SPARTA).balanceOf(poolAddresses[i]);
            unchecked {++i;}
        }
        tvlSPARTA = tvlSPARTA * 2;
    }

    // Setters

    function setStablePoolArray(address[] calldata stablePoolArray) external {
        // Loop and require(isPool)
        stableCoinPools = stablePoolArray;
    }

    function setReservePoolArray(address[] calldata reservePoolArray) external {
        // Loop and require(isPool)
        reserveHeldPools = reservePoolArray;
    }

    function setBondPoolArray(address[] calldata bondPoolArray) external {
        // Loop and require(isPool)
        bondedPools = bondPoolArray;
    }

}
