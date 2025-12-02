# Plant Monitoring System using ESP32, Mosquitto MQTT, Node.js Backend and Frontend Dashboard

This project is a complete IoT-based plant monitoring system that collects real-time sensor data using an ESP32 and displays it on a web dashboard. The ESP32 publishes sensor values to a Mosquitto MQTT broker. A Node.js backend processes the data and updates the frontend dashboard.

This document explains the architecture, hardware connections, software setup, and the functioning of every component in a simple and professional manner.

---

## Features

- Real-time monitoring of:
  - Temperature and humidity (DHT22)
  - Soil moisture (Analog sensor)
  - Light intensity (LDR with voltage divider)
- ESP32 publishes data in JSON format to an MQTT topic
- Mosquitto broker handles communication
- Node.js backend subscribes and processes data
- Frontend dashboard displays updated values continuously
- Fully wireless communication using Wi-Fi and MQTT

---

## System Architecture

1. ESP32 reads values from all sensors.
2. ESP32 connects to Wi-Fi and publishes JSON packets to the MQTT topic `plant/data`.
3. Mosquitto MQTT broker receives these values.
4. The Node.js backend subscribes to `plant/data` and extracts sensor readings.
5. The backend sends the values to the frontend dashboard.
6. The dashboard displays real-time graphs and metrics.

---

## Hardware Components

- ESP32 Development Board
- Soil Moisture Analog Sensor
- LDR (Light Dependent Resistor)
- 10k ohm resistor for LDR voltage divider
- DHT22 Temperature and Humidity Sensor
- Jumper wires
- Breadboard
- USB cable (for power and programming)

---

## Final Pin Configuration

These pins were selected after confirming the sensors work reliably on them.

| Sensor | ESP32 Pin Used | Description |
|--------|----------------|-------------|
| DHT22 Data | GPIO 4 | Requires 10k pull-up | 
| Soil Moisture Sensor | GPIO 34 | Analog input |
| LDR Output | GPIO 32 | Using voltage divider |

---

## Sensor Wiring Details

### DHT22 Connection

| DHT22 Pin | ESP32 Pin |
|-----------|-----------|
| VCC | 3.3V |
| DATA | GPIO 4 |
| GND | GND |
| Resistor | 10k resistor between DATA and 3.3V |

### Soil Moisture Sensor Connection

| Soil Sensor Pin | ESP32 Pin |
|------------------|-----------|
| VCC | 3.3V |
| GND | GND |
| A0 (Analog Out) | GPIO 34 |

### LDR Voltage Divider Connection

The LDR must be used with a 10k resistor in a voltage divider circuit.

