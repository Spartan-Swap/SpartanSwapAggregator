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
        uint256 baseAmount; // Pool.baseAmount()
        uint256 tokenAmount; // Pool.tokenAmount()
        uint256 totalSupply; // Pool.totalSupply()
        uint256 baseCap; // Pool.baseCap()
        uint256 balance; // Pool.balanceOf(walletAddr)
        uint256 oldRate; // Pool.oldRate()
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

    /** Contract Getters */

    function getDaoAddr() external view returns (address) {
        return iSPARTA(SPARTA).DAO(); // Call SPARTAv2 token contract for SPv2 DAO address
    }

    function getPoolFactoryAddr() external view returns (address) {
        return iDAO(iSPARTA(SPARTA).DAO()).POOLFACTORY(); // Call SPv2 DAO contract for SPv2 PoolFactory address
    }

    function getReserveAddr() external view returns (address) {
        return iDAO(iSPARTA(SPARTA).DAO()).RESERVE(); //
    }

    function getSynthFactoryAddr() external view returns (address) {
        return iDAO(iSPARTA(SPARTA).DAO()).SYNTHFACTORY(); //
    }

    function getSynthVaultAddr() external view returns (address) {
        return iDAO(iSPARTA(SPARTA).DAO()).SYNTHVAULT(); //
    }

    function getBondVaultAddr() external view returns (address) {
        return iDAO(iSPARTA(SPARTA).DAO()).BONDVAULT(); //
    }

    function getDaoVaultAddr() external view returns (address) {
        return iDAO(iSPARTA(SPARTA).DAO()).DAOVAULT(); //
    }

    /** PoolFactory Getters */

    function getListedTokens() external view returns (address[] memory) {
        // Returning the `address[] memory` is fine for current AMM design as the gas limit wont be reached
        // However V3 should utilize a `.length` and loop mappings to ensure scalability
        return iPOOLFACTORY(iDAO(iSPARTA(SPARTA).DAO()).POOLFACTORY()).getTokenAssets();
    }

    function getListedPools() external view returns (address[] memory) {
        // Returning the `address[] memory` is fine for current AMM design as the gas limit wont be reached
        // However V3 should utilize a `.length` and loop mappings to ensure scalability
        return iPOOLFACTORY(iDAO(iSPARTA(SPARTA).DAO()).POOLFACTORY()).getPoolAssets();
    }

    function getCuratedPools() external view returns (address[] memory) {
        return iPOOLFACTORY(iDAO(iSPARTA(SPARTA).DAO()).POOLFACTORY()).getVaultAssets();
    }


    function getGlobalDetails()
        external
        view
        returns (GlobalDetails[] memory returnData)
    {
        // Dont cache Sparta address because its immutable (cheap gas)
        address _reserve = iDAO(iSPARTA(SPARTA).DAO()).RESERVE(); // Cache Reserve Address
        returnData = new GlobalDetails[](1);
        GlobalDetails memory global = returnData[0];
        global.emitting = iSPARTA(SPARTA).emitting();
        global.totalSupply = iSPARTA(SPARTA).totalSupply();
        global.secondsPerEra = iSPARTA(SPARTA).secondsPerEra();
        global.deadSupply = iSPARTA(SPARTA).balanceOf(
            0x000000000000000000000000000000000000dEaD
        );
        global.emissions = iRESERVE(_reserve).emissions();
        global.spartaBalance = iSPARTA(SPARTA).balanceOf(iDAO(iSPARTA(SPARTA).DAO()).RESERVE());
        global.globalFreeze = iRESERVE(_reserve).globalFreeze();
    }
    
    function getDaoGlobalDetails() external view returns (DaoGlobalDetails[] memory returnData) {
        address _dao = iSPARTA(SPARTA).DAO(); // Cache dao address
        returnData = new DaoGlobalDetails[](1);
        DaoGlobalDetails memory daoGlobal = returnData[0];
        daoGlobal.running = iDAO(_dao).running();
        daoGlobal.coolOffPeriod = iDAO(_dao).coolOffPeriod();
        daoGlobal.erasToEarn = iDAO(_dao).erasToEarn();
        daoGlobal.daoClaim = iDAO(_dao).daoClaim();
        daoGlobal.daoFee = iDAO(_dao).daoFee();
        daoGlobal.currentProposal = iDAO(_dao).currentProposal();
        daoGlobal.cancelPeriod = iDAO(_dao).cancelPeriod();
    }

    function getTokenDetails(address userAddr, address[] calldata tokens)
        external
        view
        returns (TokenDetails[] memory returnData)
    {
        uint256 _length = tokens.length; // Cache array length
        returnData = new TokenDetails[](_length);
        for (uint256 i = 0; i < _length; ) {
            address _token = tokens[i]; // Cache token address
            TokenDetails memory token = returnData[i];
            if (_token == WBNB || _token == address(0)) {
                token.decimals = 18;
                token.symbol = 'WBNB';
            } else {
                token.decimals = iERC20(_token).decimals();
                token.symbol = iERC20(_token).symbol();
            }
            if (userAddr != address(0)) {
                if (_token == WBNB || _token == address(0)) {
                    token.balance = address(userAddr).balance;
                } else {
                    token.balance = iERC20(_token).balanceOf(userAddr);
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
        uint256 _length = tokens.length; // Cache array length
        returnData = new PoolDetails[](_length);
        for (uint256 i = 0; i < _length; ) {
            address _poolAddr = iPOOLFACTORY(iDAO(iSPARTA(SPARTA).DAO()).POOLFACTORY()).getPool(tokens[i]); // Cache pool address
            PoolDetails memory pool = returnData[i];
            pool.poolAddress = _poolAddr;
            pool.frozen = iPOOL(_poolAddr).freeze();
            pool.genesis = iPOOL(_poolAddr).genesis();
            pool.baseAmount = iPOOL(_poolAddr).baseAmount();
            pool.tokenAmount = iPOOL(_poolAddr).tokenAmount();
            pool.totalSupply = iPOOL(_poolAddr).totalSupply();
            pool.baseCap = iPOOL(_poolAddr).baseCap();
            if (userAddr != address(0)) {
                pool.balance = iPOOL(_poolAddr).balanceOf(userAddr);
            }
            pool.oldRate = iPOOL(_poolAddr).oldRate();
            unchecked {++i;}
        }
    }

    function getReserveHoldings() public view returns (ReserveDetails[] memory returnData) {
        address[] memory _reservePools = reserveHeldPools; // Cache pool array
        uint256 _length = _reservePools.length; // Cache array length
        returnData = new ReserveDetails[](_length);
        for (uint256 i = 0; i < _length; ) {
            address _pool = _reservePools[i]; // Cache pool address
            ReserveDetails memory resPool = returnData[i];
            resPool.poolAddress = _pool;
            uint256 _resBalance = iPOOL(_pool).balanceOf(iDAO(iSPARTA(SPARTA).DAO()).RESERVE());
            uint256 _poolTotalSupply = iPOOL(_pool).totalSupply();
            uint256 _poolBaseAmount = iPOOL(_pool).baseAmount();
            uint256 _poolTokenAmount = iPOOL(_pool).tokenAmount();
            resPool.poolTotalSupply = _poolTotalSupply;
            resPool.poolBaseAmount = _poolBaseAmount;
            resPool.poolTokenAmount = _poolTokenAmount;
            resPool.resBalance = _resBalance;
            resPool.resSparta = (_poolBaseAmount * _resBalance) / _poolTotalSupply; // This logic should really be client-side (wasted computation)
            resPool.resTokens = (_poolTokenAmount * _resBalance) / _poolTotalSupply; // This logic should really be client-side (wasted computation)
            unchecked {++i;}
        }
    }

    function getSynthDetails(address userAddr, address[] calldata tokens)
        external
        view
        returns (SynthDetails[] memory returnData)
    {
        uint256 _length = tokens.length; // Cache array length
        address _synthFactory = iDAO(iSPARTA(SPARTA).DAO()).SYNTHFACTORY(); // Cache synth factory address
        address _synthVault = iDAO(iSPARTA(SPARTA).DAO()).SYNTHVAULT(); // Cache synth vault address
        returnData = new SynthDetails[](_length);
        for (uint256 i = 0; i < _length; ) {
            address _synthAddr = iSYNTHFACTORY(_synthFactory).getSynth(tokens[i]);
            SynthDetails memory synth = returnData[i];
            synth.synthAddress = _synthAddr;
            synth.collateral = iSYNTH(_synthAddr).collateral();
            synth.totalSupply = iSYNTH(_synthAddr).totalSupply();
            if (userAddr != address(0)) {
                synth.balance = iSYNTH(_synthAddr).balanceOf(userAddr);
                synth.staked = iSYNTHVAULT(_synthVault).getMemberDeposit(userAddr, _synthAddr);
            }
            unchecked {++i;}
        }
    }

    function getBondDetails(address userAddr)
        external
        view
        returns (BondDetails[] memory returnData)
    {
        address[] memory _bondedPools = bondedPools; // Cache pool array
        uint256 _length = _bondedPools.length; // Cache array length
        address _bondVault = iDAO(iSPARTA(SPARTA).DAO()).BONDVAULT();
        returnData = new BondDetails[](_length);
        for (uint256 i = 0; i < _length; ) {
            address _poolAddr = _bondedPools[i]; // Cache pool address
            BondDetails memory bond = returnData[i];
            bond.poolAddress = _poolAddr;
            bond.bondedTotal = iBONDVAULT(_bondVault).mapTotalPool_balance(_poolAddr);
            if (userAddr != address(0)) {
                (bool isMember, uint256 bondedMember, uint256 claimRate, uint256 lastBlockTime) 
                    = iBONDVAULT(_bondVault).getMemberDetails(userAddr, _poolAddr);
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
        address _daoVault = iDAO(iSPARTA(SPARTA).DAO()).DAOVAULT(); // Cache dao vault address
        uint256 _length = pools.length; // Cache array length
        returnData = new DaoDetails[](_length);
        for (uint256 i = 0; i < _length; ) {
            address _poolAddr = pools[i]; // Cache pool address
            DaoDetails memory dao = returnData[i];
            dao.poolAddress = _poolAddr;
            dao.globalStaked = iDAOVAULT(_daoVault).mapTotalPool_balance(_poolAddr);
            if (userAddr != address(0)) {
                dao.staked = iDAOVAULT(_daoVault).getMemberPoolBalance(_poolAddr, userAddr);
            }
            unchecked {++i;}
        }
    }

    function getTotalSupply() external view returns (uint256 totalSupply) {
        totalSupply =
            iSPARTA(SPARTA).totalSupply() - // RawTotalSupply
            iSPARTA(SPARTA).balanceOf(0x000000000000000000000000000000000000dEaD); // BurnedSupply
    }

    function getCircSupply() external view returns (uint256 circSupply) {
        circSupply = 
            iSPARTA(SPARTA).totalSupply() -
            iSPARTA(SPARTA).balanceOf(0x000000000000000000000000000000000000dEaD) -
            iSPARTA(SPARTA).balanceOf(iDAO(iSPARTA(SPARTA).DAO()).RESERVE());
        ReserveDetails[] memory resHoldings = getReserveHoldings();
        for (uint256 i = 0; i < resHoldings.length; ) {
            circSupply = circSupply - resHoldings[i].resSparta;
            unchecked {++i;}
        }
    }

    function getInternalPrice() external view returns (uint256 internalPrice) {
        address[] memory _stableCoinPools = stableCoinPools; // Cache pool array
        require(_stableCoinPools.length > 0, '!StableArray');
        address _pool = _stableCoinPools[0]; // Cache pool address
        internalPrice = (iPOOL(_pool).tokenAmount() * 10**18) / iPOOL(_pool).baseAmount();
        for (uint256 i = 1; i < _stableCoinPools.length; ) {
            _pool = _stableCoinPools[i]; // Re-assign cached pool (save gas by not making a new var)
            internalPrice = ((iPOOL(_pool).tokenAmount() * 10**18 / iPOOL(_pool).baseAmount()) + internalPrice) / 2;
            unchecked {++i;}
        }
    }

    function getTVLUnbounded() external view returns (uint256 tvlSPARTA) {
        address[] memory _poolAddresses = iPOOLFACTORY(iDAO(iSPARTA(SPARTA).DAO()).POOLFACTORY()).getTokenAssets(); // Cache pool array
        for (uint256 i = 0; i < _poolAddresses.length; ) {
            tvlSPARTA = tvlSPARTA + iSPARTA(SPARTA).balanceOf(_poolAddresses[i]);
            unchecked {++i;}
        }
        tvlSPARTA = tvlSPARTA * 2;
    }

    function getTVL(address[] calldata poolAddresses) external view returns (uint256 tvlSPARTA) {
        for (uint256 i = 0; i < poolAddresses.length; ) {
            tvlSPARTA = tvlSPARTA + iSPARTA(SPARTA).balanceOf(poolAddresses[i]);
            unchecked {++i;}
        }
        tvlSPARTA = tvlSPARTA * 2;
    }

    // Setters

    function setStablePoolArray(address[] calldata stablePoolArray) external {
        // TODO: Loop and require(isPool) - Sanity
        stableCoinPools = stablePoolArray;
    }

    function setReservePoolArray(address[] calldata reservePoolArray) external {
        // TODO: Loop and require(isPool) - Sanity
        reserveHeldPools = reservePoolArray;
    }

    function setBondPoolArray(address[] calldata bondPoolArray) external {
        // TODO: Loop and require(isPool) - Sanity
        bondedPools = bondPoolArray;
    }

}
