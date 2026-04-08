const Blockchain = require('../blockchain/blockchain');
const verifyZKP = require('../zkp/zkp');
const generateFileHash = require('../utils/hash');

const blockchain = new Blockchain();
let hashSet = new Set();

exports.uploadFile = (req, res) => {
    const start = Date.now();

    const filePath = req.file.path;

    const hash = generateFileHash(filePath);

    let status = "Valid";

    if (hashSet.has(hash)) {
        status = "Duplicate";
    } else {
        hashSet.add(hash);
    }

    const block = blockchain.addBlock({ file: req.file.filename });

    const zkpResult = verifyZKP(hash, block.hash);

    const end = Date.now();

    res.json({
        file: req.file.filename,
        status: status,
        zkpVerified: zkpResult,
        time: (end - start) + " ms"
    });
};

exports.getChain = (req, res) => {
    res.json(blockchain.getChain());
};