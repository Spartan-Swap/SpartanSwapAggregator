const getBalances = async (tokenContract, userAddrArray) => {
  results = [];
  for (let i = 0; i < userAddrArray.length; i++) {
    const result = await tokenContract.balanceOf(userAddrArray[i]);
    results.push(result.toString());
  }
  return results;
};

module.exports = {
  getBalances,
};
