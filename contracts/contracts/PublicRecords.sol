// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IVerifierAge {
    struct Proof {
        uint256[2] a;
        uint256[2][2] b;
        uint256[2] c;
    }
    function verifyTx(Proof calldata proof, uint256[2] calldata input) external view returns (bool);
}

interface IVerifierHash {
    struct Proof {
        uint256[2] a;
        uint256[2][2] b;
        uint256[2] c;
    }
    function verifyTx(Proof calldata proof, uint256[2] calldata input) external view returns (bool);
}

interface IVerifierOwn {
    struct Proof {
        uint256[2] a;
        uint256[2][2] b;
        uint256[2] c;
    }
    function verifyTx(Proof calldata proof, uint256[2] calldata input) external view returns (bool);
}

contract PublicRecords {
    struct Record {
        string cid;
        bytes32 fileHash;
        address owner;
        uint256 timestamp;
        bool exists;
    }

    mapping(bytes32 => Record) private records;

    IVerifierAge public immutable ageVerifier;
    IVerifierHash public immutable hashVerifier;
    IVerifierOwn public immutable ownVerifier;

    event RecordAdded(bytes32 indexed fileHash, address indexed owner, string cid);
    event RecordVerified(bytes32 indexed fileHash, bool valid);
    event ZKPVerified(bytes32 indexed fileHash, string proofType, bool valid);

    constructor(address _age, address _hash, address _own) {
        ageVerifier = IVerifierAge(_age);
        hashVerifier = IVerifierHash(_hash);
        ownVerifier = IVerifierOwn(_own);
    }

    function addRecord(bytes32 fileHash, string calldata cid, address owner) external {
        require(fileHash != bytes32(0), "invalid hash");
        require(!records[fileHash].exists, "duplicate");

        records[fileHash] = Record({
            cid: cid,
            fileHash: fileHash,
            owner: owner,
            timestamp: block.timestamp,
            exists: true
        });

        emit RecordAdded(fileHash, owner, cid);
    }

    function verifyRecord(bytes32 fileHash) external returns (bool) {
        bool valid = records[fileHash].exists;
        emit RecordVerified(fileHash, valid);
        return valid;
    }

    function isRecordValid(bytes32 fileHash) external view returns (bool) {
    return records[fileHash].exists;
}

    function getRecord(bytes32 fileHash) external view returns (Record memory) {
        require(records[fileHash].exists, "not found");
        return records[fileHash];
    }

    function verifyAgeProof(
        bytes32 fileHash,
        IVerifierAge.Proof calldata proof,
        uint256[2] calldata input
    ) external returns (bool) {
        require(records[fileHash].exists, "not found");
        bool ok = ageVerifier.verifyTx(proof, input);
        emit ZKPVerified(fileHash, "age", ok);
        return ok;
    }

    function verifyHashProof(
        bytes32 fileHash,
        IVerifierHash.Proof calldata proof,
        uint256[2] calldata input
    ) external returns (bool) {
        require(records[fileHash].exists, "not found");
        bool ok = hashVerifier.verifyTx(proof, input);
        emit ZKPVerified(fileHash, "integrity", ok);
        return ok;
    }

    function verifyOwnershipProof(
        bytes32 fileHash,
        IVerifierOwn.Proof calldata proof,
        uint256[2] calldata input
    ) external returns (bool) {
        require(records[fileHash].exists, "not found");
        bool ok = ownVerifier.verifyTx(proof, input);
        emit ZKPVerified(fileHash, "ownership", ok);
        return ok;
    }
}
