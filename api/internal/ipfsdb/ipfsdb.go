package ipfsdb

import "fmt"

// Mock interface for local development (simulates IPFS persistence)
type IPFSDB struct {
    store map[string]interface{}
}

func New() *IPFSDB {
    return &IPFSDB{store: make(map[string]interface{})}
}

func (db *IPFSDB) Save(key string, value interface{}) error {
    db.store[key] = value
    fmt.Println("Saved to mock IPFS:", key)
    return nil
}

func (db *IPFSDB) Get(key string) (interface{}, bool) {
    val, ok := db.store[key]
    return val, ok
}

func (db *IPFSDB) ListKeys() []string {
    keys := make([]string, 0, len(db.store))
    for k := range db.store {
        keys = append(keys, k)
    }
    return keys
}


