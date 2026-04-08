const express = require('express');
const uploadRoutes = require('./routes/uploadRoutes');

const app = express();

app.use(express.json());
app.use('/', uploadRoutes);

const PORT = 3000;

app.get('/', (req, res) => {
    res.send(`
        <h2>Upload Birth Certificate</h2>
        <form action="/upload" method="post" enctype="multipart/form-data">
            <input type="file" name="file"/>
            <button type="submit">Upload</button>
        </form>
    `);
});
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});