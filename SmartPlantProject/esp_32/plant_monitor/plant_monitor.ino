/***************************************************
 * ESP32 → Mosquitto → Backend → Frontend Dashboard
 * Sensors: Soil + LDR + DHT22
 * Topic: plant/data   (matches your mqttHandler.js)
 ***************************************************/

#include <WiFi.h>
#include <PubSubClient.h>
#include <DHT.h>

/* ---------- SENSOR CONFIG ---------- */
#define SOIL_PIN 32      // ADC1 (WiFi safe)
#define LDR_PIN  35      // ADC1
#define DHT_PIN  13
#define DHTTYPE  DHT22
// <<< START CHANGE: Add Pin for Physical Switch - Changed to GPIO 16 as a recommended alternative
#define POWER_SWITCH_PIN 16 // Recommended alternative GPIO pin
// <<< END CHANGE

DHT dht(DHT_PIN, DHTTYPE);
/* ---------- WIFI & MQTT CONFIG ---------- */
const char* ssid = "YOUR_SSID";          // CHANGE THIS
const char* password = "YOUR_PASSWORD";
// CHANGE THIS
const char* mqtt_server = "ip_address"; // CHANGE → your PC (Mosquitto) IP
const int mqtt_port = 1883;
const char* mqtt_topic = "plant/data";   // EXACT topic your backend listens to

WiFiClient espClient;
PubSubClient client(espClient);
/* ---------- CONNECT WIFI ---------- */
void setupWifi() {
  Serial.print("Connecting to WiFi: ");
  Serial.println(ssid);

  WiFi.begin(ssid, password);
while (WiFi.status() != WL_CONNECTED) {
    delay(400);
    Serial.print(".");
  }

  Serial.println("\nWiFi Connected!");
  Serial.print("IP Address: ");
  Serial.println(WiFi.localIP());
}

/* ---------- MQTT RECONNECT ---------- */
void reconnect() {
  while (!client.connected()) {
    Serial.print("Connecting to MQTT...");
if (client.connect("ESP32PlantNode")) {
      Serial.println("Connected.");
    } else {
      Serial.print("Failed. Error=");
      Serial.print(client.state());
Serial.println(" Retrying in 3s...");
      delay(3000);
    }
  }
}

/* ---------- SETUP ---------- */
void setup() {
  Serial.begin(115200);
  delay(200);
// ADC configuration
  analogReadResolution(12);  
  analogSetPinAttenuation(SOIL_PIN, ADC_11db);
  analogSetPinAttenuation(LDR_PIN,  ADC_11db);

  dht.begin();

  // <<< START CHANGE: Configure Switch Pin
  pinMode(POWER_SWITCH_PIN, INPUT_PULLUP); // INPUT_PULLUP assumes the switch connects to GND when ON.
  // <<< END CHANGE

  setupWifi();
  client.setServer(mqtt_server, mqtt_port);
}

/* ---------- MAIN LOOP ---------- */
void loop() {
  // <<< START CHANGE: Read Switch State and Gate Logic
  int switchState = digitalRead(POWER_SWITCH_PIN);

  // If using INPUT_PULLUP, LOW means the switch is closed (ON)
  if (switchState == LOW) { 
    // System is ON, proceed with data gathering and publishing
    if (!client.connected()) reconnect();
    client.loop();

    // Read sensors
    int soil = analogRead(SOIL_PIN);   
    int light = analogRead(LDR_PIN);
    float temp = dht.readTemperature();
    float hum  = dht.readHumidity();

    if (isnan(temp)) temp = -1;
    if (isnan(hum)) hum = -1;

    // JSON string EXACTLY like backend expects
    String json = "{";
    json += "\"temperature\":" + String(temp, 1) + ",";
    json += "\"humidity\":"    + String(hum, 1) + ",";
    json += "\"soil\":"        + String(soil) + ",";
    json += "\"light\":"       + String(light);
    json += "}";

    // Publish to broker
    client.publish(mqtt_topic, json.c_str());

    Serial.println("Published: " + json);
  } else {
    // System is OFF
    Serial.println("System OFF - Skipping data publishing.");
  }
  // <<< END CHANGE

  delay(3000);  // update every 3 sec
}