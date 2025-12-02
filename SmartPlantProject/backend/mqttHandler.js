// backend/mqttHandler.js
const mqtt = require("mqtt");

// Connect to Mosquitto
const client = mqtt.connect("mqtt://127.0.0.1:1883");

// <<< START CHANGE: currentReadings now stores data AND timestamp
let currentReadings = { data: {}, timestamp: 0 }; 
// Define a threshold (e.g., 5 seconds) for data to be considered fresh
const DATA_FRESHNESS_THRESHOLD_MS = 5000; 
// <<< END CHANGE

client.on("connect", () => {
    console.log("MQTT Handler: Connected to Broker");
    client.subscribe("plant/data");
});

client.on("message", (topic, message) => {
    const msgString = message.toString();
    console.log("MQTT Received: " + msgString);
    try {
        // Update the variable with new data
        // <<< START CHANGE: Store new data and update timestamp
        currentReadings.data = JSON.parse(msgString);
        currentReadings.timestamp = Date.now();
        // <<< END CHANGE
    } catch (e) {
        console.error("Invalid JSON received");
    }
});

// IMPORTANT: Export a function that returns the current variable
module.exports = { 
    // <<< START CHANGE: Check data freshness before returning
    getData: () => {
        const currentTime = Date.now();
        
        // If the last update was within the threshold, return the data
        if (currentTime - currentReadings.timestamp < DATA_FRESHNESS_THRESHOLD_MS) {
            return currentReadings.data;
        } else {
            // Otherwise, return an empty object to signal stale/off status
            return {};
        }
    }
    // <<< END CHANGE
};