#include <WiFi.h>
#include <HTTPClient.h>

const char* WIFI_SSID = "strongwheel";
const char* WIFI_PASSWORD = "10041534";

// Capstone server PC IP
const char* SERVER_ORIGIN = "http://192.168.0.10:8000";

const int SENSOR_COUNT = 3;

// sensor 1: left cheek
// sensor 2: right cheek
// sensor 3: lips
const int sensorPins[SENSOR_COUNT] = {
  14,  // blush_left 
  27,  // blush_right 
  26   // lips 
};

const int sensorIds[SENSOR_COUNT] = {
  1,
  2,
  3
};

int lastStates[SENSOR_COUNT] = { HIGH, HIGH, HIGH };
unsigned long lastSentAt[SENSOR_COUNT] = { 0, 0, 0 };

const unsigned long DEBOUNCE_MS = 80;
const unsigned long COOLDOWN_MS = 500;

void sendSensorEvent(int sensorId, int value) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi disconnected");
    return;
  }

  String url = String(SERVER_ORIGIN)
    + "/api/touchdesigner/sensor?id="
    + String(sensorId)
    + "&value="
    + String(value);

  HTTPClient http;
  http.begin(url);

  int statusCode = http.GET();
  String response = http.getString();

  Serial.print("GET ");
  Serial.println(url);
  Serial.print("status: ");
  Serial.println(statusCode);
  Serial.print("response: ");
  Serial.println(response);

  http.end();
}

void setup() {
  Serial.begin(115200);

  for (int i = 0; i < SENSOR_COUNT; i++) {
    pinMode(sensorPins[i], INPUT_PULLUP);
    lastStates[i] = digitalRead(sensorPins[i]);
  }

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  Serial.print("Connecting WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(300);
    Serial.print(".");
  }

  Serial.println();
  Serial.println("WiFi connected");
  Serial.print("Arduino IP: ");
  Serial.println(WiFi.localIP());
}

void loop() {
  unsigned long now = millis();

  for (int i = 0; i < SENSOR_COUNT; i++) {
    int currentState = digitalRead(sensorPins[i]);

    if (currentState != lastStates[i]) {
      delay(DEBOUNCE_MS);
      currentState = digitalRead(sensorPins[i]);

      if (currentState != lastStates[i]) {
        lastStates[i] = currentState;

        bool magnetDetected = currentState == LOW;

        if (magnetDetected && now - lastSentAt[i] > COOLDOWN_MS) {
          sendSensorEvent(sensorIds[i], 1);
          lastSentAt[i] = now;
        }
      }
    }
  }
}