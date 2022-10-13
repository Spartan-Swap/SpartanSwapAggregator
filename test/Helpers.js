const address0 = "0x0000000000000000000000000000000000000000";

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

module.exports = {
  getBalances,
  deployPool,
  curatePool,
  unCuratePool,
};
