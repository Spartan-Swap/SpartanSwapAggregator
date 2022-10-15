const { expect } = require("chai");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { BigNumber } = require("ethers");
const { deployPool, curatePool, unCuratePool } = require("./Helpers");

const address0 = "0x0000000000000000000000000000000000000000";
const one = BigNumber.from("1000000000000000000");
const minAmount = "1000000000000000000000";

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
    await Sparta.approve(PoolFact.address, one.mul(1000000000000000), {
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
    // Deploy token contracts
    const tokenCount = 10; // How many tokens should we deploy?
    const tokenObjects = []; // Array to push deployed token contract objects to
    const tokenArray = []; // TokenArray to push deployed token contract addresses to
    for (let i = 0; i < tokenCount; i++) {
      const _NewToken = await ethers.getContractFactory("Token1");
      const NewToken = await _NewToken.deploy("Token" + i);
      tokenObjects.push(NewToken);
      tokenArray.push(NewToken.address);
    }
    // console.log(tokenArray);
    // console.log(tokenObjects);

    for (let i = 0; i < tokenArray.length; i++) {
      await tokenObjects[i].approve(
        PoolFact.address,
        one.mul(1000000000000000),
        {
          from: owner.address,
        }
      );
    }

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
    // Deploy token contracts
    const tokenCount = 10; // How many tokens should we deploy?
    const tokenObjects = []; // Array to push deployed token contract objects to
    const tokenArray = []; // TokenArray to push deployed token contract addresses to
    for (let i = 0; i < tokenCount; i++) {
      const _NewToken = await ethers.getContractFactory("Token1");
      const NewToken = await _NewToken.deploy("Token" + i);
      tokenObjects.push(NewToken);
      tokenArray.push(NewToken.address);
    }
    // console.log(tokenArray);
    // console.log(tokenObjects);

    for (let i = 0; i < tokenArray.length; i++) {
      await tokenObjects[i].approve(
        PoolFact.address,
        one.mul(1000000000000000),
        {
          from: owner.address,
        }
      );
    }

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
    const { Sparta, SSUtils, Reserve } = await loadFixture(deployTokenFixture);
    await Sparta.transfer(Reserve.address, 50);
    const circSupply = await SSUtils.getCircSupply();
    // console.log(circSupply);
    expect(circSupply).to.be.greaterThan(0);
  });
});
