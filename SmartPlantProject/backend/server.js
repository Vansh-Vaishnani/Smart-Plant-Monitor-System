// backend/server.js
const express = require("express");
const cors = require("cors");
// Import the 'getData' function we created in the other file
const { getData } = require("./mqttHandler");

const app = express();
app.use(cors());

app.get("/data", (req, res) => {
    // Call the function to get the LATEST data right now
    const data = getData(); 
    console.log("Frontend asked for data, sending:", data); 
    res.json(data);
});

app.listen(5000, () => console.log("Backend running on http://localhost:5000"));