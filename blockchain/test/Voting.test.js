const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Voting Contract - Coercion Resistance", function () {
  let Voting;
  let voting;
  let owner;
  let voter;

  beforeEach(async function () {
    [owner, voter] = await ethers.getSigners();
    Voting = await ethers.getContractFactory("Voting");
    voting = await Voting.deploy();
    
    // Add two candidates
    await voting.addCandidate("Candidate A");
    await voting.addCandidate("Candidate B");
  });

  async function getSignature(voterAddress, candidateId) {
    const messageHash = ethers.solidityPackedKeccak256(
      ["string", "address", "string", "uint256"],
      ["Voter:", voterAddress, "Candidate:", candidateId]
    );
    const messageHashBinary = ethers.getBytes(messageHash);
    return await owner.signMessage(messageHashBinary);
  }

  it("Should allow a voter to change their vote (Last Vote Counts)", async function () {
    // 1. First Vote for Candidate A (Coerced)
    const sigA = await getSignature(voter.address, 1);
    await voting.connect(voter).vote(1, sigA);
    
    expect((await voting.candidates(1)).voteCount).to.equal(1);
    expect((await voting.candidates(2)).voteCount).to.equal(0);

    // 2. Second Vote for Candidate B (Real Choice)
    const sigB = await getSignature(voter.address, 2);
    await voting.connect(voter).vote(2, sigB);

    // Old candidate should be 0, new candidate should be 1
    expect((await voting.candidates(1)).voteCount).to.equal(0);
    expect((await voting.candidates(2)).voteCount).to.equal(1);
  });

  it("Should fail if the backend signature is invalid", async function () {
    const [_, attacker] = await ethers.getSigners();
    const messageHash = ethers.solidityPackedKeccak256(
      ["string", "address", "string", "uint256"],
      ["Voter:", voter.address, "Candidate:", 1]
    );
    const messageHashBinary = ethers.getBytes(messageHash);
    const invalidSig = await attacker.signMessage(messageHashBinary); // Signed by attacker, not admin

    await expect(voting.connect(voter).vote(1, invalidSig)).to.be.revertedWith("Invalid backend signature");
  });
});
