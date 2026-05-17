// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract Voting {
    struct Candidate {
        uint id;
        string name;
        uint voteCount;
    }

    struct Voter {
        bool hasVoted;
        uint votedCandidateId;
    }

    address public owner;
    mapping(uint => Candidate) public candidates;
    mapping(address => Voter) public voters;
    mapping(string => Voter) public votersByUsername;
    uint public candidatesCount;

    event Voted(uint indexed candidateId, address indexed voter, bool isUpdate);
    event CandidateAdded(uint indexed candidateId, string name);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only admin can call this");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function addCandidate(string memory _name) public onlyOwner {
        candidatesCount++;
        candidates[candidatesCount] = Candidate(candidatesCount, _name, 0);
        emit CandidateAdded(candidatesCount, _name);
    }

    function vote(uint _candidateId, bytes memory signature) public {
        require(_candidateId > 0 && _candidateId <= candidatesCount, "Invalid candidate ID");
        
        // Verify Backend Authorization
        bytes32 messageHash = keccak256(abi.encodePacked("Voter:", msg.sender, "Candidate:", _candidateId));
        bytes32 ethSignedMessageHash = getEthSignedMessageHash(messageHash);
        require(recoverSigner(ethSignedMessageHash, signature) == owner, "Invalid backend signature");

        bool isUpdate = false;
        if (voters[msg.sender].hasVoted) {
            uint previousId = voters[msg.sender].votedCandidateId;
            candidates[previousId].voteCount--;
            isUpdate = true;
        }

        voters[msg.sender].hasVoted = true;
        voters[msg.sender].votedCandidateId = _candidateId;
        candidates[_candidateId].voteCount++;

        emit Voted(_candidateId, msg.sender, isUpdate);
    }

    function adminCastVote(string memory _username, uint _candidateId) public onlyOwner {
        require(_candidateId > 0 && _candidateId <= candidatesCount, "Invalid candidate ID");
        
        bool isUpdate = false;
        if (votersByUsername[_username].hasVoted) {
            uint previousId = votersByUsername[_username].votedCandidateId;
            candidates[previousId].voteCount--;
            isUpdate = true;
        }

        votersByUsername[_username].hasVoted = true;
        votersByUsername[_username].votedCandidateId = _candidateId;
        candidates[_candidateId].voteCount++;

        emit Voted(_candidateId, msg.sender, isUpdate);
    }

    function getEthSignedMessageHash(bytes32 _messageHash) public pure returns (bytes32) {
        return keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", _messageHash));
    }

    function recoverSigner(bytes32 _ethSignedMessageHash, bytes memory _signature) public pure returns (address) {
        (bytes32 r, bytes32 s, uint8 v) = splitSignature(_signature);
        return ecrecover(_ethSignedMessageHash, v, r, s);
    }

    function splitSignature(bytes memory sig) public pure returns (bytes32 r, bytes32 s, uint8 v) {
        require(sig.length == 65, "invalid signature length");
        assembly {
            r := mload(add(sig, 32))
            s := mload(add(sig, 64))
            v := byte(0, mload(add(sig, 96)))
        }
    }

    function getResults(uint _candidateId) public view returns (uint) {
        require(_candidateId > 0 && _candidateId <= candidatesCount, "Invalid candidate ID");
        return candidates[_candidateId].voteCount;
    }

    function getAllCandidates() public view returns (Candidate[] memory) {
        Candidate[] memory allCandidates = new Candidate[](candidatesCount);
        for (uint i = 1; i <= candidatesCount; i++) {
            allCandidates[i - 1] = candidates[i];
        }
        return allCandidates;
    }
}
