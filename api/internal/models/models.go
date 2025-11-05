package models

import "time"

type Signature struct {
    Alg   string `json:"alg"`
    KeyID string `json:"keyId"`
    JWS   string `json:"jws"`
}

type Node struct {
    ID        string                 `json:"id"`
    Kind      string                 `json:"kind"`
    Author    string                 `json:"author"`
    Body      map[string]interface{} `json:"body"`
    CreatedAt time.Time              `json:"createdAt"`
    Hash      string                 `json:"hash"`
    Sig       Signature              `json:"sig"`
}

type Artifact struct {
    ID        string    `json:"id"`
    NodeID    string    `json:"nodeId"`
    Name      string    `json:"name"`
    MediaType string    `json:"mediaType"`
    Size      int64     `json:"size"`
    SHA256    string    `json:"sha256"`
    PHASH     string    `json:"phash,omitempty"`
    Path      string    `json:"path"`
    CreatedAt time.Time `json:"createdAt"`
}

type Manifest struct {
    ID        string     `json:"id"`
    SessionID string     `json:"sessionId"`
    Nodes     []Node     `json:"nodes"`
    Artifacts []Artifact `json:"artifacts"`
    CreatedAt time.Time  `json:"createdAt"`
    Sig       Signature  `json:"sig"`
}


