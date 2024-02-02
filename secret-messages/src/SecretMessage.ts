import { Field, SmartContract, state, State, method, PublicKey, MerkleWitness, Poseidon, MerkleMapWitness, Sign, Signature, Nullifier, Circuit, Provable, MerkleMap } from 'o1js';

export class SecretMessageWitness extends MerkleWitness(256) { }
export class EligibleAddressesWitness extends MerkleWitness(8) { }
const NullifierTree = new MerkleMap();
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
    this.nullifierRoot.set(NullifierTree.getRoot());
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

  @method useNullifier(nullifier: Nullifier) {
    
    let nullifierRoot = this.nullifierRoot.getAndRequireEquals();

    nullifier.verify(this.sender.toFields());
    let nullfierWitness = Provable.witness(MerkleMapWitness, () => 
      NullifierTree.getWitness(nullifier.key())
    );
    nullifier.assertUnused(nullfierWitness, nullifierRoot);
    let newRoot = nullifier.setUsed(nullfierWitness);
    this.nullifierRoot.set(newRoot);
  }

  @method storeValidMessages(nullifier: Nullifier, secretMessage: Field, messageWitness: MerkleMapWitness, signature: Signature, addressWitness: EligibleAddressesWitness) {
   
    this.didNotStoreMessageBefore(nullifier);
    
    this.ensureWhitelistedAddress(signature, secretMessage, addressWitness);

    this.validateMessage(secretMessage);

    this.storeSecret(messageWitness, secretMessage);

    this.incrementMessageCount();
  }

  private incrementMessageCount() {
    const currentState = this.messageCount.getAndRequireEquals();
    const newState = currentState.add(1);
    this.messageCount.set(newState);
  }

  private storeSecret(messageWitness: MerkleMapWitness, secretMessage: Field) {
    this.messagesRoot.getAndRequireEquals();
    const [messageRoot, _] = messageWitness.computeRootAndKey(Poseidon.hash(secretMessage.toFields()));
    this.messagesRoot.set(messageRoot);
  }

  private validateMessage(secretMessage: Field) {
    secretMessage.assertNotEquals(Field(0));
    // validate message according ot rules using bitwise operations?
    // ...
  }

  private ensureWhitelistedAddress(signature: Signature, secretMessage: Field, addressWitness: EligibleAddressesWitness) {
    const addressRoot = this.eligibleAddressesRoot.getAndRequireEquals();
    signature.verify(this.sender, secretMessage.toFields()).assertTrue();
    const witnessRoot = addressWitness.calculateRoot(Poseidon.hash(this.sender.toFields()));
    witnessRoot.assertEquals(addressRoot);
  }

  private didNotStoreMessageBefore(nullifier: Nullifier) {
    let nullifierRoot = this.nullifierRoot.getAndRequireEquals();

    nullifier.verify(this.sender.toFields());
    let nullfierWitness = Provable.witness(MerkleMapWitness, () => NullifierTree.getWitness(nullifier.key())
    );
    nullifier.assertUnused(nullfierWitness, nullifierRoot);
    let newRoot = nullifier.setUsed(nullfierWitness);
    this.nullifierRoot.set(newRoot);
  }
}
