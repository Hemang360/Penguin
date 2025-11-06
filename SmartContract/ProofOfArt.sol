// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title ProofOfArt
 * @dev Smart contract for storing immutable proof of AI-generated artwork authorship
 */
contract ProofOfArt {
    
    struct ArtProof {
        string artworkId;
        address artistWallet;
        string contentHash;      // BLAKE2b hash of watermarked content
        string ipfsHash;         // IPFS DAG CID containing metadata
        string noiseSignature;   // Unique watermark pattern signature
        uint256 timestamp;
        bool exists;
    }
    
    // Mapping from artwork ID to proof
    mapping(string => ArtProof) public artProofs;
    
    // Mapping from artist wallet to list of their artwork IDs
    mapping(address => string[]) public artistArtworks;
    
    // Mapping to track if a content hash has been registered
    mapping(string => bool) public registeredHashes;
    
    // Events
    event ArtworkRegistered(
        string indexed artworkId,
        address indexed artist,
        string contentHash,
        string ipfsHash,
        uint256 timestamp
    );
    
    event VerificationRequested(
        string indexed artworkId,
        address indexed requester,
        uint256 timestamp
    );
    
    /**
     * @dev Register a new artwork proof on the blockchain
     * @param _artworkId Unique identifier for the artwork
     * @param _contentHash BLAKE2b hash of the watermarked content
     * @param _ipfsHash IPFS DAG CID containing full metadata
     * @param _noiseSignature Unique watermark pattern signature
     */
    function registerArtwork(
        string memory _artworkId,
        string memory _contentHash,
        string memory _ipfsHash,
        string memory _noiseSignature
    ) external {
        require(!artProofs[_artworkId].exists, "Artwork already registered");
        require(!registeredHashes[_contentHash], "Content hash already registered");
        require(bytes(_artworkId).length > 0, "Invalid artwork ID");
        require(bytes(_contentHash).length > 0, "Invalid content hash");
        require(bytes(_ipfsHash).length > 0, "Invalid IPFS hash");
        
        ArtProof memory newProof = ArtProof({
            artworkId: _artworkId,
            artistWallet: msg.sender,
            contentHash: _contentHash,
            ipfsHash: _ipfsHash,
            noiseSignature: _noiseSignature,
            timestamp: block.timestamp,
            exists: true
        });
        
        artProofs[_artworkId] = newProof;
        artistArtworks[msg.sender].push(_artworkId);
        registeredHashes[_contentHash] = true;
        
        emit ArtworkRegistered(
            _artworkId,
            msg.sender,
            _contentHash,
            _ipfsHash,
            block.timestamp
        );
    }
    
    /**
     * @dev Verify if an artwork exists and return its proof
     * @param _artworkId The artwork ID to verify
     * @return proof The artwork proof struct
     */
    function verifyArtwork(string memory _artworkId) 
        external 
        returns (ArtProof memory proof) 
    {
        require(artProofs[_artworkId].exists, "Artwork not found");
        
        emit VerificationRequested(_artworkId, msg.sender, block.timestamp);
        
        return artProofs[_artworkId];
    }
    
    /**
     * @dev Get artwork proof by ID (view function, no gas cost)
     * @param _artworkId The artwork ID
     * @return proof The artwork proof struct
     */
    function getArtworkProof(string memory _artworkId) 
        external 
        view 
        returns (ArtProof memory proof) 
    {
        require(artProofs[_artworkId].exists, "Artwork not found");
        return artProofs[_artworkId];
    }
    
    /**
     * @dev Check if a content hash has been registered
     * @param _contentHash The content hash to check
     * @return registered True if hash is registered
     */
    function isHashRegistered(string memory _contentHash) 
        external 
        view 
        returns (bool registered) 
    {
        return registeredHashes[_contentHash];
    }
    
    /**
     * @dev Get all artwork IDs for an artist
     * @param _artist The artist's wallet address
     * @return artworkIds Array of artwork IDs
     */
    function getArtistArtworks(address _artist) 
        external 
        view 
        returns (string[] memory artworkIds) 
    {
        return artistArtworks[_artist];
    }
    
    /**
     * @dev Get the original artist of an artwork
     * @param _artworkId The artwork ID
     * @return artist The artist's wallet address
     */
    function getArtworkArtist(string memory _artworkId) 
        external 
        view 
        returns (address artist) 
    {
        require(artProofs[_artworkId].exists, "Artwork not found");
        return artProofs[_artworkId].artistWallet;
    }
    
    /**
     * @dev Verify if an artist owns an artwork
     * @param _artworkId The artwork ID
     * @param _artist The artist's address to check
     * @return owns True if artist owns the artwork
     */
    function verifyOwnership(string memory _artworkId, address _artist) 
        external 
        view 
        returns (bool owns) 
    {
        if (!artProofs[_artworkId].exists) {
            return false;
        }
        return artProofs[_artworkId].artistWallet == _artist;
    }
    
    /**
     * @dev Batch register multiple artworks (gas efficient for multiple uploads)
     * @param _artworkIds Array of artwork IDs
     * @param _contentHashes Array of content hashes
     * @param _ipfsHashes Array of IPFS hashes
     * @param _noiseSignatures Array of noise signatures
     */
    function batchRegisterArtworks(
        string[] memory _artworkIds,
        string[] memory _contentHashes,
        string[] memory _ipfsHashes,
        string[] memory _noiseSignatures
    ) external {
        require(_artworkIds.length == _contentHashes.length, "Array length mismatch");
        require(_artworkIds.length == _ipfsHashes.length, "Array length mismatch");
        require(_artworkIds.length == _noiseSignatures.length, "Array length mismatch");
        require(_artworkIds.length > 0 && _artworkIds.length <= 50, "Invalid batch size");
        
        for (uint256 i = 0; i < _artworkIds.length; i++) {
            require(!artProofs[_artworkIds[i]].exists, "Artwork already registered");
            require(!registeredHashes[_contentHashes[i]], "Content hash already registered");
            
            ArtProof memory newProof = ArtProof({
                artworkId: _artworkIds[i],
                artistWallet: msg.sender,
                contentHash: _contentHashes[i],
                ipfsHash: _ipfsHashes[i],
                noiseSignature: _noiseSignatures[i],
                timestamp: block.timestamp,
                exists: true
            });
            
            artProofs[_artworkIds[i]] = newProof;
            artistArtworks[msg.sender].push(_artworkIds[i]);
            registeredHashes[_contentHashes[i]] = true;
            
            emit ArtworkRegistered(
                _artworkIds[i],
                msg.sender,
                _contentHashes[i],
                _ipfsHashes[i],
                block.timestamp
            );
        }
    }
}