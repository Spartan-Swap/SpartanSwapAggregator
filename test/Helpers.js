const address0 = "0x0000000000000000000000000000000000000000";
const one = "1000000000000000000";
const minAmount = "1000000000000000000000";
const allowAmnt = "100000000000000000000000000000000000000000000";

const getBalances = async (tokenContract, userAddrArray) => {
  results = [];
  for (let i = 0; i < userAddrArray.length; i++) {
    const result = await tokenContract.balanceOf(userAddrArray[i]);
    results.push(result.toString());
  }
  return results;
};

const deployPool = async (addLiqAmount, PoolFact, tokenAddr) => {
  await PoolFact.createPoolADD(addLiqAmount, addLiqAmount, tokenAddr, {
    value: tokenAddr === address0 ? addLiqAmount : 0,
  });
};

const curatePool = async (PoolFact, tokenAddr) => {
  await PoolFact.addCuratedPool(tokenAddr);
};

const unCuratePool = async (PoolFact, tokenAddr) => {
  await PoolFact.removeCuratedPool(tokenAddr);
};

const deployBatchTokens = async (tokenCount, namingString, spenderAddr, apprvContrArray) => {
  // Deploy token contracts
  const tokenObjects = []; // Array to push deployed token contract objects to
  const tokenArray = []; // TokenArray to push deployed token contract addresses to
  for (let i = 0; i < tokenCount; i++) {
    const _NewToken = await ethers.getContractFactory("Token1");
    const NewToken = await _NewToken.deploy(namingString + i);
    tokenObjects.push(NewToken);
    tokenArray.push(NewToken.address);
  }
  // Do approvals
  for (let i = 0; i < tokenObjects.length; i++) {
    for (let ii = 0; ii < apprvContrArray.length; ii++) {
      await tokenObjects[i].approve(apprvContrArray[ii], allowAmnt, {
        from: spenderAddr,
      });
    }
  }
  return { tokenObjects, tokenArray };
};

module.exports = {
  address0,
  minAmount,
  allowAmnt,
  one,
  getBalances,
  deployPool,
  curatePool,
  unCuratePool,
  deployBatchTokens,
};
