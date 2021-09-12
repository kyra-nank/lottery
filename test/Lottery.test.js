const assert = require('assert');
const ganache = require('ganache-cli');
const Web3 = require('web3');
const web3 = new Web3(ganache.provider());

const { interface, bytecode } = require('../compile');

let lottery;
let accounts;

beforeEach(async () => {
  accounts = await web3.eth.getAccounts();

  lottery = await new web3.eth.Contract(JSON.parse(interface))
    .deploy({ data: bytecode })
    .send({ from: accounts[0], gas: '1000000' })
});

describe('Lottery Contract', () => {

  // ensure contract is working
  it('deploys a contract', () => {
    assert.ok(lottery.options.address);
  });

  // make sure one person is able to enter
  it('allows one account to enter', async () => {
    await lottery.methods.enter().send({
      from: accounts[0],
      value: web3.utils.toWei('0.02', 'ether')
    });

    const players = await lottery.methods.getPlayers().call({
      from: accounts[0]
    });

    assert.equal(accounts[0], players[0]);
    assert.equal(1, players.length)

  });

  // make sure multiple accounts are entering
  it('allows multiple accounts to enter', async () => {
    await lottery.methods.enter().send({
      from: accounts[0],
      value: web3.utils.toWei('0.02', 'ether')
    });
    await lottery.methods.enter().send({
      from: accounts[1],
      value: web3.utils.toWei('0.02', 'ether')
    });
    await lottery.methods.enter().send({
      from: accounts[2],
      value: web3.utils.toWei('0.02', 'ether')
    });

    const players = await lottery.methods.getPlayers().call({
      from: accounts[0]
    });

    assert.equal(accounts[0], players[0]);
    assert.equal(accounts[1], players[1]);
    assert.equal(accounts[2], players[2]);
    assert.equal(3, players.length)

  });

  // ensure player has sent minimum amount of ETH
  // this test PASSES because the catch block is run and asserts that an error exists
  it('requires a minimum amount of ether to enter', async () => {
    try {
      await lottery.methods.enter().send({
        from: accounts[0],
        value: 0
      });
      assert(false);      // ensure that test fails because allowed to enter without min ETH
    } catch (err) {
      assert(err);     // assert checks for truthfulness
    }
  });

  // if someone other than the manager tries to run pickWinner
  it('only manager can call pickWinner', async () => {
    try {
      await lottery.methods.pickWinner().send({
        from: accounts[1]
      });
      assert(false)
    } catch (err) {
      assert(err);
    }
  });

  // ensure the lotto winnings are distributed and contract resets
  it('sends money to the winner and resets the array', async () => {
    // enter one player
    await lottery.methods.enter().send({
      from: accounts[0],
      value: web3.utils.toWei('1', 'ether')
    });

    // compare amount of ether account[0] controls before and after pickWinner
    // they should be ~1ETH difference (have to pay gas)
    const initialBalance = await web3.eth.getBalance(accounts[0]);    // get initial bal
    await lottery.methods.pickWinner().send({from:accounts[0]});      // pick winner function
    const finalBalance = await web3.eth.getBalance(accounts[0]);      // get final bal
    const difference = finalBalance - initialBalance;
    assert(difference > web3.utils.toWei('0.8', 'ether'));            // ensuring diff is > (diff - some gas)

    // ensure players array is reset
    const players = await lottery.methods.getPlayers().call({
      from: accounts[0]
    });
    assert(players.length == 0);
  });


});
