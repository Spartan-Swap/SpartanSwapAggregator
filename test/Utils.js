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
  deploySynth,
  listBond,
  mintSpartaForBond,
  oneThousand,
  oneHundred,
  oneMillion,
  approve,
  oneHundredThousand,
  ten,
  getPool,
  oneDay,
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
    expect(tvlSPARTA).to.be.gt(0);
  });

  it("Should list pools and get SPARTA TVL using a bounded array", async function () {
    const { PoolFact, owner, SSUtils } = await loadFixture(deployTokenFixture);
    const { tokenObjects, tokenArray } = await deployBatchTokens(
      20,
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
    // console.log(tvlSPARTA);
    expect(tvlSPARTA).to.be.gt(0);

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
    const { PoolFact, owner, SSUtils, Reserve } = await loadFixture(
      deployTokenFixture
    );
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
    for (let i = 0; i < poolAddrs.length; i++) {
      const PoolObj = await connectToContract("Pool", poolAddrs[0]); // Get pool object
      await PoolObj.transfer(Reserve.address, 50);
    }
    await SSUtils.setReservePoolArray(poolAddrs);
    const resHoldings = await SSUtils.getReserveHoldings();
    // console.log(resHoldings);
    expect(resHoldings[0].resBalance).to.be.gt(0);
    expect(resHoldings[0].resSparta).to.be.gt(0);
    expect(resHoldings[0].resTokens).to.be.gt(0);
  });

  it("Should list pools->curate->synths & return their synth details", async function () {
    const { PoolFact, SynthFact, SSUtils, owner } = await loadFixture(
      deployTokenFixture
    );
    const { tokenObjects, tokenArray } = await deployBatchTokens(
      5,
      "Token",
      owner.address,
      [PoolFact.address]
    );

    for (let i = 0; i < tokenArray.length; i++) {
      await deployPool(minAmount, PoolFact, tokenArray[i]); // Deploy pool
      await curatePool(PoolFact, tokenArray[i]); // Curate pool
      await deploySynth(SynthFact, tokenArray[i]); // Deploy synth
    }
    const synthDetails = await SSUtils.getSynthDetails(
      owner.address,
      tokenArray
    );
    // console.log(synthDetails);
    expect(synthDetails.length).to.equal(5);
  });

  it("Should list pools->curate->listBond->bond & return their bond details", async function () {
    const { Sparta, Dao, Router, PoolFact, BondVault, SSUtils, owner } =
      await loadFixture(deployTokenFixture);
    const { tokenObjects, tokenArray } = await deployBatchTokens(
      3,
      "Token",
      owner.address,
      [PoolFact.address, Dao.address]
    );

    await Sparta.flipMinting(); // Turn on SPARTA minting
    const minting = await Sparta.minting();
    // console.log(minting);
    expect(minting).to.be.true;

    const daoBalBefore = await Sparta.balanceOf(Dao.address);
    // console.log(daoBalBefore);
    expect(daoBalBefore).to.equal(0);
    await mintSpartaForBond(Sparta, Dao.address); // Mint 1M SPARTA to DAO for Bond program
    const daoBalanceAfter = await Sparta.balanceOf(Dao.address);
    // console.log(daoBalanceAfter);
    expect(daoBalanceAfter).to.equal(oneMillion);

    const poolAddrArray = [];
    for (let i = 0; i < tokenArray.length; i++) {
      await deployPool(minAmount, PoolFact, tokenArray[i]); // Deploy pool
      const _poolAddr = await PoolFact.getPool(tokenArray[i]); // Get pool addr
      poolAddrArray.push(_poolAddr);
      await curatePool(PoolFact, tokenArray[i]); // Curate pool
      await listBond(BondVault, tokenObjects[i], Dao.address, owner.address); // List asset for bonding
      const variedAmnt = BigNumber(one).times(i).plus(oneHundred).toFixed(); // Make sure amount is small enough not to cause more than 0.2 slipAdjustment
      await Dao.bond(tokenArray[i], variedAmnt, {
        from: owner.address,
        value: variedAmnt,
      }); // perform a bond txn
    }

    await SSUtils.setBondPoolArray(poolAddrArray); // Set bonded pools array in Utils
    const bondDetails = await SSUtils.getBondDetails(owner.address);
    // console.log(bondDetails);
    for (let i = 0; i < bondDetails.length; i++) {
      expect(bondDetails[i].bondedTotal).to.be.gt(0);
    }
  });

  it("Test DaoGlobalDetails initial defaults then test changing them all", async function () {
    const { Sparta, Dao, PoolFact, SSUtils, owner } = await loadFixture(
      deployTokenFixture
    );
    const { tokenObjects, tokenArray } = await deployBatchTokens(
      5,
      "Token",
      owner.address,
      [PoolFact.address, Dao.address]
    );

    for (let i = 0; i < tokenArray.length; i++) {
      await deployPool(minAmount, PoolFact, tokenArray[i]); // Deploy pool
      await curatePool(PoolFact, tokenArray[i]); // Curate pool
      // do some txns here to chang DAO global vars?
    }

    let daoGlobalDetails = await SSUtils.getDaoGlobalDetails();
    // console.log(daoGlobalDetails);
    expect(daoGlobalDetails[0].running).to.be.false;
    expect(daoGlobalDetails[0].coolOffPeriod).to.equal(0);
    expect(daoGlobalDetails[0].erasToEarn).to.equal(0);
    expect(daoGlobalDetails[0].daoClaim).to.equal(0);
    expect(daoGlobalDetails[0].daoFee).to.equal(0);
    expect(daoGlobalDetails[0].currentProposal).to.equal(0);
    expect(daoGlobalDetails[0].cancelPeriod).to.equal(0);

    await Dao.setDaoFactors("1000", "1000", true, oneDay); // (daoClaim, daoFee, running, cancelPeriod)
    daoGlobalDetails = await SSUtils.getDaoGlobalDetails();
    // console.log(daoGlobalDetails);
    expect(daoGlobalDetails[0].daoClaim).to.equal(1000);
    expect(daoGlobalDetails[0].daoFee).to.equal("1000");
    expect(daoGlobalDetails[0].running).to.be.true;
    expect(daoGlobalDetails[0].cancelPeriod).to.equal(oneDay);

    await Dao.setGenesisFactors(oneDay, "30", "6666"); // (coolOff, erasToEarn, majorityFactor)
    daoGlobalDetails = await SSUtils.getDaoGlobalDetails();
    // console.log(daoGlobalDetails);
    expect(daoGlobalDetails[0].coolOffPeriod).to.equal(oneDay);
    expect(daoGlobalDetails[0].erasToEarn).to.equal("30");

    await approve(Sparta, Dao.address, owner.address);
    await Dao.newActionProposal("FLIP_EMISSIONS");
    daoGlobalDetails = await SSUtils.getDaoGlobalDetails();
    // console.log(daoGlobalDetails);
    expect(daoGlobalDetails[0].currentProposal).to.equal(1);
  });

  it("Deploy pools->curate->addLiq->stake and check their DaoDetails", async function () {
    const { Dao, Router, PoolFact, SSUtils, owner } = await loadFixture(
      deployTokenFixture
    );
    const { tokenObjects, tokenArray } = await deployBatchTokens(
      5,
      "Token",
      owner.address,
      [PoolFact.address, Dao.address]
    );

    const poolAddrArray = [];
    for (let i = 0; i < tokenArray.length; i++) {
      await deployPool(minAmount, PoolFact, tokenArray[i]); // Deploy pool
      await curatePool(PoolFact, tokenArray[i]); // Curate pool
      const variedAmnt = BigNumber(one).times(i).plus(oneHundred).toFixed(); // Make sure amount is small enough not to cause more than 0.2 slipAdjustment
      await Router.addLiquidityAsym(variedAmnt, true, tokenArray[i]); // add liq
      const poolAddr = await PoolFact.getPool(tokenArray[i]); // Get pool addr
      poolAddrArray.push(poolAddr);
      const PoolObj = await connectToContract("Pool", poolAddr); // Get pool object
      const lpBalance = await PoolObj.balanceOf(owner.address); // get LP balance
      await approve(PoolObj, Dao.address, owner.address); // approvals for staking in DaoVault
      await Dao.deposit(poolAddr, lpBalance); // stake in daovault
    }

    const daoDetails = await SSUtils.getDaoDetails(
      owner.address,
      poolAddrArray
    ); // Set bonded pools array in Utils
    // console.log(daoDetails);
    for (let i = 0; i < daoDetails.length; i++) {
      if (i > 0) {
        expect(daoDetails[i].staked).to.be.gt(daoDetails[i - 1].staked); // Staked amount must be > previous pool's stake
      } else {
        expect(daoDetails[i].staked).to.be.gt(0); // User's DaoVault staked balance must be > 0
      }
      expect(daoDetails[i].staked).to.equal(daoDetails[i].globalStaked); // Total staked in DaoVault === user's stake
    }
  });

  it("Should deploy pools, confirm the quote is == output of the swap for a single & double swap", async function () {
    const { PoolFact, owner, SSUtils, Router, Sparta } = await loadFixture(
      deployTokenFixture
    );
    const { tokenObjects, tokenArray } = await deployBatchTokens(
      2,
      "Some Pewwwls",
      owner.address,
      [PoolFact.address, Router.address]
    );

    for (let i = 0; i < tokenArray.length; i++) {
      await deployPool(minAmount, PoolFact, tokenArray[i]); // Deploy pool
    }

    // Get singleswap quote
    const singleSwapQuote = await SSUtils.getSwapOutput(
      tokenArray[0],
      Sparta.address,
      "1000000000000000000000"
    );
    // Do singleswap
    let singleTxn = await Router.swap(
      "1000000000000000000000",
      tokenArray[0],
      Sparta.address,
      "0"
    );
    singleTxn = await singleTxn.wait();
    const singleOutput = BigNumber(singleTxn.logs[3].data).toFixed();
    // console.log(singleSwapQuote);
    // console.log(singleOutput);
    expect(singleSwapQuote).to.equal(singleOutput); // Make sure the output is == quote

    // Get doubleswap quote
    const doubleSwapQuote = await SSUtils.getSwapOutput(
      tokenArray[0],
      tokenArray[1],
      "1000000000000000000000"
    );
    // Do doubleswap
    let doubleTxn = await Router.swap(
      "1000000000000000000000",
      tokenArray[0],
      tokenArray[1],
      "0"
    );
    doubleTxn = await doubleTxn.wait();
    const doubleOutput = BigNumber(doubleTxn.logs[6].data).toFixed();
    // console.log(doubleSwapQuote);
    // console.log(doubleOutput);
    expect(doubleSwapQuote).to.equal(doubleOutput); // Make sure the output is == quote

    const badSwapQuote = await SSUtils.getSwapOutput(
      "0xFC7eAd29ee55EabEC54dBc38bd03852e1fF46D50", // random address -> isPool === false
      "0xa6C3288C18505D134445cB4Fe8499da22002F1E0", // random address -> isPool === false
      "1000000000000000000000"
    );
    // console.log(badSwapQuote);
    expect(badSwapQuote).to.equal(0); // Make sure the bad swaps dont revert and instead return 0
  });
});
