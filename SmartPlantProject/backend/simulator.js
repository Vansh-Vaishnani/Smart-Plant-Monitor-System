const mqtt = require("mqtt");

// Connect to the same Mosquitto broker your backend uses
const client = mqtt.connect("mqtt://127.0.0.1:1883");

client.on("connect", () => {
    console.log("Simulator: Connected to MQTT Broker!");
    
    // Send fake data every 3 seconds
    setInterval(() => {
        // Generate random fake numbers
        const fakeTemp = (20 + Math.random() * 10).toFixed(1); // 20-30°C
        const fakeHum = (40 + Math.random() * 20).toFixed(1);  // 40-60%
        const fakeSoil = Math.floor(Math.random() * 4095);     // 0-4095
        const fakeLight = Math.floor(Math.random() * 4095);    // 0-4095

        // Create the JSON exactly how the backend expects it [cite: 515]
        const payload = JSON.stringify({
            temperature: parseFloat(fakeTemp),
            humidity: parseFloat(fakeHum),
            soil: fakeSoil,
            light: fakeLight
        });

        console.log("Simulator sending:", payload);
        
        // Publish to the topic your backend listens to [cite: 512]
        client.publish("plant/data", payload);

    }, 3000); // 3 seconds
});