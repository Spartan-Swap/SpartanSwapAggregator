const { expect, assert } = require("chai");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { BigNumber } = require("ethers");
const { getBalances } = require("./Helpers");

const address0 = "0x0000000000000000000000000000000000000000";
const one = BigNumber.from("1000000000000000000");
const minAmount = "1000000000000000000000";

describe("Deploy and test", function () {
  it("Should pass all tests", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    const _WBNB = await ethers.getContractFactory("WBNB");
    const WBNB = await _WBNB.deploy();
    const _Sparta = await ethers.getContractFactory("Sparta");
    const Sparta = await _Sparta.deploy(address0); // Deploy with SPARTAv1 set as address(0) | ie. testing v1->v2 upgrades will not work
    const _Dao = await ethers.getContractFactory("Dao");
    const Dao = await _Dao.deploy(Sparta.address);
    const _PoolFact = await ethers.getContractFactory("PoolFactory");
    const PoolFact = await _PoolFact.deploy(Sparta.address, WBNB.address);
    const _Router = await ethers.getContractFactory("Router");
    const Router = await _Router.deploy(Sparta.address, WBNB.address);
    const _Reserve = await ethers.getContractFactory("Reserve");
    const Reserve = await _Reserve.deploy(Sparta.address, WBNB.address);
    const _Utils = await ethers.getContractFactory("Utils");
    const Utils = await _Utils.deploy(Sparta.address);
    const _DaoVault = await ethers.getContractFactory("DaoVault");
    const DaoVault = await _DaoVault.deploy(Sparta.address);
    const _SSUtils = await ethers.getContractFactory("SpartanSwapUtils");
    const SSUtils = await _SSUtils.deploy(Sparta.address, WBNB.address);

    await Dao.setGenesisAddresses(
      Router.address,
      Utils.address,
      Reserve.address,
      Utils.address
    );

    await Dao.setVaultAddresses(
      DaoVault.address,
      DaoVault.address,
      DaoVault.address
    );
    await Dao.setFactoryAddresses(PoolFact.address, PoolFact.address);
    await Sparta.changeDAO(Dao.address);

    // APROVALS
    await Sparta.approve(PoolFact.address, one.mul(1000000000000000), {
      from: owner.address,
    });

    console.log(
      "balances sparta",
      await getBalances(Sparta, [owner.address, addr1.address])
    );
    await expect(Sparta.transfer(addr1.address, 50)).to.changeTokenBalances(
      Sparta,
      [owner, addr1],
      [-50, 50]
    );
    console.log(
      "balances sparta",
      await getBalances(Sparta, [owner.address, addr1.address])
    );

    const poolBNB = await PoolFact.createPoolADD(
      minAmount,
      minAmount,
      address0,
      { value: minAmount }
    );
    console.log("BNB pool addr:", await PoolFact.getPool(address0));

    console.log("dao addr:", await SSUtils.getDaoAddr());
    console.log("poolFact addr:", await SSUtils.getPoolFactoryAddr());
    console.log("reserve addr:", await SSUtils.getReserveAddr());
    console.log("listed tokens:", await SSUtils.getListedTokens());
    console.log("curated pools:", await SSUtils.getCuratedPools());
    console.log("global details:", await SSUtils.getGlobalDetails());
    console.log(
      "token details:",
      await SSUtils.getTokenDetails(owner.address, [address0])
    );
    console.log(
      "pool details:",
      await SSUtils.getPoolDetails(owner.address, [address0])
    );
  });
});
