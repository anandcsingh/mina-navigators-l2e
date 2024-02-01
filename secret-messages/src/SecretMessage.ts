import { Field, SmartContract, state, State, method, PublicKey, MerkleWitness, Poseidon, MerkleMapWitness, Sign, Signature } from 'o1js';
import { Signable } from 'o1js/dist/node/bindings/lib/provable-bigint';
import { sign } from 'o1js/dist/node/mina-signer/src/signature';


export class SecretMessageWitness extends MerkleWitness(256) { }
export class EligibleAddressesWitness extends MerkleWitness(8) { }

export class SecretMessage extends SmartContract {
  @state(Field) messageCount = State<Field>();
  @state(Field) eligibleAddressesCount = State<Field>();
  @state(Field) eligibleAddressesRoot = State<Field>();
  @state(Field) messagesRoot = State<Field>();
  @state(Field) nullifierRoot = State<Field>();

  init() {
    super.init();
    this.messageCount.set(Field(0));
    this.eligibleAddressesCount.set(Field(0));
    this.eligibleAddressesRoot.set(Field(0));
    this.messagesRoot.set(Field(0));
    this.nullifierRoot.set(Field(0));
  }

  @method setEligibleAddressesRoot(newRoot: Field) {
    // only owners should do this
    this.eligibleAddressesRoot.getAndRequireEquals();
    this.eligibleAddressesRoot.set(newRoot);
  }
  @method setAddressesCount(count: Field) {
    // only owners should do this
    this.eligibleAddressesCount.getAndRequireEquals();
    this.eligibleAddressesCount.set(count);
  }

  @method storeEligibleAddresses(address: PublicKey, witness: EligibleAddressesWitness) {

    // validate max number of addresses
    const addressCount = this.eligibleAddressesCount.getAndRequireEquals();
    const newAddressCount = addressCount.add(1);
    newAddressCount.assertLessThanOrEqual(100);

    // update eligible addresses root
    this.eligibleAddressesRoot.getAndRequireEquals();
    const hash = Poseidon.hash(address.toFields());
    const newRoot = witness.calculateRoot(hash);
    this.eligibleAddressesRoot.set(newRoot);
    this.eligibleAddressesCount.set(newAddressCount);
  }

  @method storeValidMessages(message: Field, messageWitness: MerkleMapWitness, signature: Signature, addressWitness: EligibleAddressesWitness) {
   
    // current user check if they are eligible
    const addressRoot = this.eligibleAddressesRoot.getAndRequireEquals();
    signature.verify(this.sender, message.toFields()).assertTrue();
    const witnessRoot = addressWitness.calculateRoot(Poseidon.hash(this.sender.toFields()));
    witnessRoot.assertEquals(addressRoot);

    // update messages root
    this.messagesRoot.getAndRequireEquals();
    const [messageRoot, _] = messageWitness.computeRootAndKey(Poseidon.hash(message.toFields()));
    this.messagesRoot.set(messageRoot);

    const currentState = this.messageCount.getAndRequireEquals();
    const newState = currentState.add(1);
    this.messageCount.set(newState);
  }
}
