import { EligibleAddressesWitness, SecretMessage } from './SecretMessage';
import { Field, Mina, PrivateKey, PublicKey, AccountUpdate, MerkleTree, Poseidon } from 'o1js';

/*
 * This file specifies how to test the `Add` example smart contract. It is safe to delete this file and replace
 * with your own tests.
 *
 * See https://docs.minaprotocol.com/zkapps for more info.
 */

let proofsEnabled = false;

describe('SecretMessage', () => {
  let deployerAccount: PublicKey,
    deployerKey: PrivateKey,
    senderAccount: PublicKey,
    senderKey: PrivateKey,
    zkAppAddress: PublicKey,
    zkAppPrivateKey: PrivateKey,
    zkApp: SecretMessage;

  beforeAll(async () => {
    if (proofsEnabled) await SecretMessage.compile();
  });

  beforeEach(() => {
    const Local = Mina.LocalBlockchain({ proofsEnabled });
    Mina.setActiveInstance(Local);
    ({ privateKey: deployerKey, publicKey: deployerAccount } =
      Local.testAccounts[0]);
    ({ privateKey: senderKey, publicKey: senderAccount } =
      Local.testAccounts[1]);
    zkAppPrivateKey = PrivateKey.random();
    zkAppAddress = zkAppPrivateKey.toPublicKey();
    zkApp = new SecretMessage(zkAppAddress);
  });

  async function localDeploy() {
    const txn = await Mina.transaction(deployerAccount, () => {
      AccountUpdate.fundNewAccount(deployerAccount);
      zkApp.deploy();
    });
    await txn.prove();
    // this tx needs .sign(), because `deploy()` adds an account update that requires signature authorization
    await txn.sign([deployerKey, zkAppPrivateKey]).send();
  }

  // it('generates and deploys the `SecretMessage` smart contract', async () => {
  //   await localDeploy();
  //   const num = zkApp.messageCount.get();
  //   expect(num).toEqual(Field(0));
  // });

  // it('correctly increments the messageCount state on the `SecretMessage` smart contract', async () => {
  //   await localDeploy();

  //   // update transaction
  //   let txn = await Mina.transaction(senderAccount, () => {
  //     zkApp.storeValidMessages();
  //   });
  //   await txn.prove();
  //   await txn.sign([senderKey]).send();

  //   let updatedNum = zkApp.messageCount.get();
  //   expect(updatedNum).toEqual(Field(1));

  //   // update transaction
  //   txn = await Mina.transaction(senderAccount, () => {
  //     zkApp.storeValidMessages();
  //   });
  //   await txn.prove();
  //   await txn.sign([senderKey]).send();
  //   updatedNum = zkApp.messageCount.get();
  //   expect(updatedNum).toEqual(Field(2));
  // });

  // it('can store eligible addresses', async () => {
  //   await localDeploy();

  //   const addressesTree = new MerkleTree(8);
  //   addressesTree.setLeaf(0n, Poseidon.hash(senderAccount.toFields()));
  //   const witness = new EligibleAddressesWitness(addressesTree.getWitness(0n));

  //   // update transaction
  //   let txn = await Mina.transaction(senderAccount, () => {
  //     zkApp.storeEligibleAddresses(senderAccount, witness);
  //   });
  //   await txn.prove();
  //   await txn.sign([senderKey]).send();

  //   let root = zkApp.eligibleAddressesRoot.get();
  //   console.log('first root', root.toString());
  //   expect(root).toEqual(addressesTree.getRoot());

  //   addressesTree.setLeaf(1n, Poseidon.hash(deployerAccount.toFields()));
  //   const witness2 = new EligibleAddressesWitness(addressesTree.getWitness(1n));

  //   // update transaction
  //   txn = await Mina.transaction(deployerAccount, () => {
  //     zkApp.storeEligibleAddresses(deployerAccount, witness2);
  //   });
  //   await txn.prove();
  //   await txn.sign([deployerKey]).send();

  //   root = zkApp.eligibleAddressesRoot.get();
  //   console.log('second root', root.toString());
  //   expect(root).toEqual(addressesTree.getRoot());
  // });

  it('can store only 100 eligible addresses', async () => {
    await localDeploy();

    let i = 0;
    const addressesTree = new MerkleTree(8);
    for (; i < 100; i++) {
      addressesTree.setLeaf(BigInt(i), Poseidon.hash(senderAccount.toFields()));
    }

    expect(i).toEqual(100);
    let txn = await Mina.transaction(senderAccount, () => {
      zkApp.setAddressesCount(Field(100));
    });
    await txn.prove();
    await txn.sign([senderKey]).send();

    addressesTree.setLeaf(100n, Poseidon.hash(senderAccount.toFields()));
    let witness = new EligibleAddressesWitness(addressesTree.getWitness(BigInt(100)));

        // update transaction
    txn = await Mina.transaction(senderAccount, () => {
      zkApp.storeEligibleAddresses(senderAccount, witness);
    });
    await txn.prove();
    await txn.sign([senderKey]).send();
  });
});
