// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract ImageProvenance {
    struct Manifest {
        string cid;
        address creator;
        uint256 timestamp;
    }

    Manifest[] public manifests;

    event ManifestStored(
        address indexed creator,
        string cid,
        uint256 timestamp
    );

    function storeManifest(string calldata _cid) public {
        manifests.push(Manifest({
            cid: _cid,
            creator: msg.sender,
            timestamp: block.timestamp
        }));

        emit ManifestStored(msg.sender, _cid, block.timestamp);
    }

    function getAll() public view returns (Manifest[] memory) {
        return manifests;
    }

    function getCount() public view returns (uint256) {
        return manifests.length;
    }
}

