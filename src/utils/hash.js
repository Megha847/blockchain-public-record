const SHA256 = require('crypto-js/sha256');
const fs = require('fs');

function generateFileHash(filePath) {
    const fileData = fs.readFileSync(filePath);
    return SHA256(fileData.toString()).toString();
}

module.exports = generateFileHash;