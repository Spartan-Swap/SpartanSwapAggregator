const { expect } = require("chai");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const {
  deployPool,
  curatePool,
  unCuratePool,
  deployBatchTokens,
  allowAmnt,
  minAmount,
  address0,
  one,
  connectToContract,
} = require("./Helpers");
const { default: BigNumber } = require("bignumber.js");

describe("Deploy and test", function () {
  async function deployTokenFixture() {
    const [owner, addr1, addr2] = await ethers.getSigners();

    const _WBNB = await ethers.getContractFactory("WBNB");
    const WBNB = await _WBNB.deploy();
    const _Sparta = await ethers.getContractFactory("Sparta");
    const Sparta = await _Sparta.deploy(address0); // Deploy with SPARTAv1 set as address(0) | ie. testing v1->v2 upgrades will not work
    const _Dao = await ethers.getContractFactory("Dao");
    const Dao = await _Dao.deploy(Sparta.address);
    const _PoolFact = await ethers.getContractFactory("PoolFactory");
    const PoolFact = await _PoolFact.deploy(Sparta.address, WBNB.address);
    const _SynthFact = await ethers.getContractFactory("SynthFactory");
    const SynthFact = await _SynthFact.deploy(Sparta.address, WBNB.address);
    const _Router = await ethers.getContractFactory("Router");
    const Router = await _Router.deploy(Sparta.address, WBNB.address);
    const _Reserve = await ethers.getContractFactory("Reserve");
    const Reserve = await _Reserve.deploy(Sparta.address, WBNB.address);
    const _Utils = await ethers.getContractFactory("Utils");
    const Utils = await _Utils.deploy(Sparta.address);
    const _DaoVault = await ethers.getContractFactory("DaoVault");
    const DaoVault = await _DaoVault.deploy(Sparta.address);
    const _BondVault = await ethers.getContractFactory("BondVault");
    const BondVault = await _BondVault.deploy(Sparta.address);
    const _SynthVault = await ethers.getContractFactory("SynthVault");
    const SynthVault = await _SynthVault.deploy(Sparta.address);
    const _SSUtils = await ethers.getContractFactory("SpartanSwapUtils");
    const SSUtils = await _SSUtils.deploy(Sparta.address, WBNB.address);

    await Dao.setGenesisAddresses(
      Router.address,
      Utils.address,
      Reserve.address,
      Utils.address // LEND
    );

    await Dao.setVaultAddresses(
      DaoVault.address,
      BondVault.address,
      SynthVault.address
    );
    await Dao.setFactoryAddresses(PoolFact.address, SynthFact.address);
    await Sparta.changeDAO(Dao.address);

    // APROVALS
    await Sparta.approve(PoolFact.address, allowAmnt, {
      from: owner.address,
    });
    await Sparta.approve(Router.address, allowAmnt, {
      from: owner.address,
    });

    return {
      WBNB,
      Sparta,
      Dao,
      PoolFact,
      SynthFact,
      Router,
      Reserve,
      Utils,
      DaoVault,
      BondVault,
      SynthVault,
      SSUtils,
      owner,
      addr1,
      addr2,
    };
  }

  it("Should tsf sparta to addr1", async function () {
    const { Sparta, owner, addr1 } = await loadFixture(deployTokenFixture);
    // console.log(await getBalances(Sparta, [owner.address, addr1.address]));
    await expect(Sparta.transfer(addr1.address, 50)).to.changeTokenBalances(
      Sparta,
      [owner, addr1],
      [-50, 50]
    );
    // console.log(await getBalances(Sparta, [owner.address, addr1.address]));
  });

  it("Should deploy WBNB pool", async function () {
    const { PoolFact } = await loadFixture(deployTokenFixture);
    let addr = await PoolFact.getPool(address0); // Should be address0
    // console.log(addr);
    expect(addr).to.equal(address0); // Should be address0
    await deployPool(minAmount, PoolFact, address0);
    addr = await PoolFact.getPool(address0); // Should not be address0
    // console.log(addr);
    expect(addr).not.to.equal(address0); // Should not be address0
  });

  it("Should return DAO address", async function () {
    const { SSUtils } = await loadFixture(deployTokenFixture);
    const addr = await SSUtils.getDaoAddr();
    // console.log(addr);
    expect(addr).not.to.equal(address0);
  });

  it("Should return PoolFactory address", async function () {
    const { SSUtils } = await loadFixture(deployTokenFixture);
    const addr = await SSUtils.getPoolFactoryAddr();
    // console.log(addr);
    expect(addr).not.to.equal(address0);
  });

  it("Should return Reserve address", async function () {
    const { SSUtils } = await loadFixture(deployTokenFixture);
    const addr = await SSUtils.getReserveAddr();
    // console.log(addr);
    expect(addr).not.to.equal(address0);
  });

  it("Should return no listed tokens", async function () {
    const { SSUtils } = await loadFixture(deployTokenFixture);
    const listedTokens = await SSUtils.getListedTokens();
    // console.log(listedTokens);
    expect(listedTokens.length).to.equal(0);
  });

  it("Should list BNB and return one listed token", async function () {
    const { PoolFact, SSUtils } = await loadFixture(deployTokenFixture);
    await deployPool(minAmount, PoolFact, address0); // Deploy BNB pool
    const listedTokens = await SSUtils.getListedTokens();
    // console.log(listedTokens);
    expect(listedTokens.length).to.equal(1);
  });

  it("Should return no curated pools", async function () {
    const { SSUtils } = await loadFixture(deployTokenFixture);
    const curatedPools = await SSUtils.getCuratedPools();
    // console.log(curatedPools);
    expect(curatedPools.length).to.equal(0);
  });

  it("Should list BNB, curate it, then return 1 curated pool", async function () {
    const { PoolFact, SSUtils } = await loadFixture(deployTokenFixture);
    await deployPool(minAmount, PoolFact, address0); // Deploy BNB pool
    await curatePool(PoolFact, address0); // Curate BNB pool
    const curatedPools = await SSUtils.getCuratedPools();
    // console.log(curatedPools);
    expect(curatedPools.length).to.equal(1);
  });

  it("Should list BNB, curate it, un-curate it, then return 0 curated pools", async function () {
    const { PoolFact, SSUtils } = await loadFixture(deployTokenFixture);
    await deployPool(minAmount, PoolFact, address0); // Deploy BNB pool
    await curatePool(PoolFact, address0); // Curate BNB pool
    let curatedPools = await SSUtils.getCuratedPools();
    // console.log(curatedPools);
    expect(curatedPools.length).to.equal(1);
    await unCuratePool(PoolFact, address0); // Un-curate BNB pool
    curatedPools = await SSUtils.getCuratedPools();
    // console.log(curatedPools);
    expect(curatedPools.length).to.equal(0);
  });

  it("Global details should be set at defaults", async function () {
    const { SSUtils } = await loadFixture(deployTokenFixture);
    let globalDetails = await SSUtils.getGlobalDetails();
    globalDetails = globalDetails[0];
    // console.log(globalDetails);
    expect(globalDetails.emitting).to.equal(false);
    expect(globalDetails.emissions).to.equal(false);
    expect(globalDetails.globalFreeze).to.equal(false);
    expect(globalDetails.secondsPerEra).to.equal("86400");
    expect(globalDetails.deadSupply).to.equal("0");
    expect(globalDetails.spartaBalance).to.equal("0");
  });

  it("Should list pools & return their token details", async function () {
    const { PoolFact, SSUtils, owner } = await loadFixture(deployTokenFixture);
    const { tokenObjects, tokenArray } = await deployBatchTokens(
      10,
      "Token",
      owner.address,
      [PoolFact.address]
    );

    for (let i = 0; i < tokenArray.length; i++) {
      await deployPool(minAmount, PoolFact, tokenArray[i]); // Deploy pool
    }
    const tokenDetails = await SSUtils.getTokenDetails(
      owner.address,
      tokenArray
    );
    // console.log(tokenDetails);
    expect(tokenDetails.length).to.equal(10);
  });

  it("Should list pools & return their pool details", async function () {
    const { PoolFact, SSUtils, owner } = await loadFixture(deployTokenFixture);
    const { tokenObjects, tokenArray } = await deployBatchTokens(
      10,
      "Token",
      owner.address,
      [PoolFact.address]
    );

    for (let i = 0; i < tokenArray.length; i++) {
      await deployPool(minAmount, PoolFact, tokenArray[i]); // Deploy pool
    }
    const poolDetails = await SSUtils.getPoolDetails(owner.address, tokenArray);
    // console.log(poolDetails);
    expect(poolDetails.length).to.equal(10);
  });

  it("Should send some SPARTA to dead address & return adjusted total supply < token's reported total supply", async function () {
    const { Sparta, SSUtils } = await loadFixture(deployTokenFixture);
    const tokenTotalSupply = await Sparta.totalSupply();
    await Sparta.transfer("0x000000000000000000000000000000000000dEaD", 50);
    const adjTotalSupply = await SSUtils.getTotalSupply();
    // console.log(tokenTotalSupply, adjTotalSupply);
    expect(adjTotalSupply).to.be.lessThan(tokenTotalSupply);
  });

  it("Should send some SPARTA to reserve address & return circulating supply", async function () {
    const { Sparta, SSUtils, Reserve, PoolFact } = await loadFixture(
      deployTokenFixture
    );
    const circSupply0 = await SSUtils.getCircSupply(); // get initial circ supply
    // console.log(circSupply0);
    expect(circSupply0).to.be.greaterThan(0);
    await Sparta.transfer(Reserve.address, 50); // transfer some SPARTA to reserve
    const circSupply1 = await SSUtils.getCircSupply(); // get new circ supply
    // console.log(circSupply1);
    expect(circSupply0).to.be.greaterThan(circSupply1); // new circ supply should be smaller than initial
    await deployPool(minAmount, PoolFact, address0); // Deploy BNB pool
    addr = await PoolFact.getPool(address0); // Should not be address0
    const BnbPool = await connectToContract("Pool", addr);
    await BnbPool.transfer(Reserve.address, 50); // transfer some BNB LPs to the reserve
    await SSUtils.setReservePoolArray([BnbPool.address]); // Set BNB pool's addr in the reserve holdings array
    const circSupply2 = await SSUtils.getCircSupply(); // get circ supply again
    // console.log(circSupply2);
    expect(circSupply1).to.be.greaterThan(circSupply2); // it should be lower again
  });

  it("Should deploy 3 pools, assign them as stables and make sure adjustments affect the internal price", async function () {
    const { PoolFact, owner, SSUtils, Router, Sparta } = await loadFixture(
      deployTokenFixture
    );
    const { tokenObjects, tokenArray } = await deployBatchTokens(
      3,
      "Stablecoin",
      owner.address,
      [PoolFact.address, Router.address]
    );

    for (let i = 0; i < tokenArray.length; i++) {
      await deployPool(minAmount, PoolFact, tokenArray[i]); // Deploy pool
    }
    const poolDetails = await SSUtils.getPoolDetails(owner.address, tokenArray);
    const poolArray = [];
    for (let i = 0; i < poolDetails.length; i++) {
      poolArray.push(poolDetails[i].poolAddress);
    }
    await SSUtils.setStablePoolArray(poolArray); // set the stablecoinpoolarray
    let intPrice = await SSUtils.getInternalPrice(); // get internal price
    intPrice = BigNumber(intPrice.toString()).div(one);
    // console.log(intPrice.toString());
    expect(intPrice).to.equal("1"); // 10000 === $1.00

    await Router.swap(
      "1000000000000000000000",
      tokenArray[0],
      Sparta.address,
      "0"
    );

    intPrice = await SSUtils.getInternalPrice(); // get internal price
    intPrice = BigNumber(intPrice.toString()).div(one);
    // console.log("should be different due to swap", intPrice.toString());

    await SSUtils.setStablePoolArray([
      poolArray[2],
      poolArray[1],
      poolArray[0],
    ]); // reverse order to change internally derived price pool weightings
    intPrice = await SSUtils.getInternalPrice(); // get internal price
    intPrice = BigNumber(intPrice.toString()).div(one);
    // console.log("should be different due to changed stablePool priority/order", intPrice.toString());
  });

  it("Should list pools and get SPARTA TVL (unbounded)", async function () {
    const { PoolFact, owner, SSUtils } = await loadFixture(deployTokenFixture);
    const { tokenObjects, tokenArray } = await deployBatchTokens(
      3,
      "Token",
      owner.address,
      [PoolFact.address]
    );
    for (let i = 0; i < tokenArray.length; i++) {
      await deployPool(minAmount, PoolFact, tokenArray[i]); // Deploy pools
    }
    const tvlSPARTA = await SSUtils.getTVLUnbounded();
    // console.log(tvlSPARTA);
  });

  it("Should list pools and get SPARTA TVL using a bounded array", async function () {
    const { PoolFact, owner, SSUtils } = await loadFixture(deployTokenFixture);
    const { tokenObjects, tokenArray } = await deployBatchTokens(
      3,
      "Token",
      owner.address,
      [PoolFact.address]
    );
    for (let i = 0; i < tokenArray.length; i++) {
      await deployPool(minAmount, PoolFact, tokenArray[i]); // Deploy pools
    }
    const poolAddrs = await SSUtils.getListedPools();
    const tvlSPARTA = await SSUtils.getTVL(poolAddrs); // not required for v2 due to low pool count, but can be used with a different poolfactory getter design in v3
    // console.log(tvlSPARTA);
  });

  it("Should list pools and get USD TVL (unbounded)", async function () {
    const { PoolFact, owner, SSUtils } = await loadFixture(deployTokenFixture);
    const { tokenObjects, tokenArray } = await deployBatchTokens(
      3,
      "StableCoin",
      owner.address,
      [PoolFact.address]
    );
    for (let i = 0; i < tokenArray.length; i++) {
      await deployPool(minAmount, PoolFact, tokenArray[i]); // Deploy pools
    }
    const tvlSPARTA = await SSUtils.getTVLUnbounded();

    const poolDetails = await SSUtils.getPoolDetails(owner.address, tokenArray);
    const poolArray = [];
    for (let i = 0; i < poolDetails.length; i++) {
      poolArray.push(poolDetails[i].poolAddress);
    }
    await SSUtils.setStablePoolArray(poolArray); // set the stablecoinpoolarray

    const intPrice = await SSUtils.getInternalPrice();
    const tvlUSD = BigNumber(tvlSPARTA.toString()).times(
      BigNumber(intPrice.toString()).div(one).div(one)
    );
    // console.log(tvlUSD.toString());
  });

  it("Should get reserve holdings", async function () {
    const { PoolFact, owner, SSUtils } = await loadFixture(deployTokenFixture);
    const { tokenObjects, tokenArray } = await deployBatchTokens(
      5,
      "Token",
      owner.address,
      [PoolFact.address]
    );
    for (let i = 0; i < tokenArray.length; i++) {
      await deployPool(minAmount, PoolFact, tokenArray[i]); // Deploy pools
    }
    const poolAddrs = await SSUtils.getListedPools();
    const resPoolAddrs = await SSUtils.setReservePoolArray(poolAddrs);
    const resHoldings = await SSUtils.getReserveHoldings();
    // console.log(resHoldings);
  });
});
