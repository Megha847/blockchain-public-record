function verifyZKP(inputHash, storedHash) {
    return inputHash === storedHash;
}

module.exports = verifyZKP;