import { EligibleAddressesWitness, SecretMessage } from './SecretMessage';
import { Field, Mina, PrivateKey, PublicKey, AccountUpdate, MerkleTree, Poseidon, MerkleMap, Sign, Signature } from 'o1js';

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

  // it('can store only 100 eligible addresses', async () => {
  //   await localDeploy();

  //   let i = 0;
  //   let count = 99;
  //   const addressesTree = new MerkleTree(8);
  //   for (; i < count; i++) {
  //     addressesTree.setLeaf(BigInt(i), Poseidon.hash(senderAccount.toFields()));
  //   }

  //   expect(i).toEqual(count);
  //   let txn = await Mina.transaction(senderAccount, () => {
  //     zkApp.setAddressesCount(Field(count));
  //   });
  //   await txn.prove();
  //   await txn.sign([senderKey]).send();
  //   let addressesCount = zkApp.eligibleAddressesCount.get();
  //   console.log('addressesCount', addressesCount.toString());
  //   expect(addressesCount).toEqual(Field(count));

  //   addressesTree.setLeaf(BigInt(count), Poseidon.hash(senderAccount.toFields()));
  //   let witness = new EligibleAddressesWitness(addressesTree.getWitness(BigInt(count)));

  //   // update transaction
  //   txn = await Mina.transaction(senderAccount, () => {
  //     zkApp.storeEligibleAddresses(senderAccount, witness);
  //   });
  //   await txn.prove();
  //   await txn.sign([senderKey]).send();

  //   let newCount = count + 1;

  //   addressesCount = zkApp.eligibleAddressesCount.get();
  //   console.log('addressesCount', addressesCount.toString());
  //   expect(addressesCount).toEqual(Field(newCount));

  //   let failed = false;

  //   try {
  //     addressesTree.setLeaf(BigInt(newCount), Poseidon.hash(senderAccount.toFields()));
  //     witness = new EligibleAddressesWitness(addressesTree.getWitness(BigInt(newCount)));
  //     txn = await Mina.transaction(senderAccount, () => {
  //       zkApp.storeEligibleAddresses(senderAccount, witness);
  //     });
  //     await txn.prove();
  //     await txn.sign([senderKey]).send();
  //   } catch (e) {
  //     failed = true;
  //   }
  //   expect(failed).toEqual(true);

  // });

  it('can store secret message', async () => {
    await localDeploy();

    const addressesTree = new MerkleTree(8);
    addressesTree.setLeaf(0n, Poseidon.hash(senderAccount.toFields()));
    const addressWitness = new EligibleAddressesWitness(addressesTree.getWitness(0n));

    let txn = await Mina.transaction(senderAccount, () => {
      zkApp.storeEligibleAddresses(senderAccount, addressWitness);
    });
    await txn.prove();
    await txn.sign([senderKey]).send();

    let map = new MerkleMap();
    let message = Poseidon.hash(Field(1).toFields());
    let mapIndex = Field(1);
    map.set(mapIndex, message);
    let messageWitness = map.getWitness(mapIndex);

    let signature = Signature.create(senderKey, message.toFields());

    txn = await Mina.transaction(senderAccount, () => {
      zkApp.storeValidMessages(message, messageWitness, signature, addressWitness);
    });

    await txn.prove();
    await txn.sign([senderKey]).send();

    let root = zkApp.messagesRoot.get();
    console.log('messages root', root.toString());
    expect(root).toEqual(map.getRoot());

    let count = zkApp.messageCount.get();
    console.log('message count', count.toString());
    expect(count).toEqual(Field(1));
  });
});
