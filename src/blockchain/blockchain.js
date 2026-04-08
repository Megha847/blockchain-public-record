const SHA256 = require('crypto-js/sha256');

class Blockchain {
    constructor() {
        this.chain = [];
    }

    addBlock(data) {
        const hash = SHA256(JSON.stringify(data)).toString();

        const block = {
            data: data,
            hash: hash
        };

        this.chain.push(block);
        return block;
    }

    getChain() {
        return this.chain;
    }
}

module.exports = Blockchain;