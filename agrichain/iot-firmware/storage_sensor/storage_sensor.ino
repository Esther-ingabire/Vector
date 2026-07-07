#include <ESP8266WiFi.h>
#include <ESP8266WebServer.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClient.h>
#include <DHT.h>
#include <Wire.h>
#include <ArduinoJson.h>
#include <U8g2lib.h>
#include <WebSocketsServer.h>

// ===== WiFi =====
const char* ssid = "ኣስቴር_ ኢ";
const char* password = "ingabire";

// ===== ChainSight backend =====
const char* API_BASE     = "http://192.168.1.203:8000/api/v1";
const char* CREDENTIAL    = "b.mugisha@chainsight.demo";
const char* API_PASSWORD = "Demo1234!";
const int   FACILITY_ID   = 112;
const unsigned long POST_INTERVAL_MS    = 20000;               // post every 20s for a live demo
const unsigned long RELOGIN_INTERVAL_MS = 50UL * 60UL * 1000UL; // token expires after 60 min

String accessToken;
unsigned long lastPost = 0;
unsigned long lastLogin = 0;
int lastPostHttpCode = 0;

// ===== DHT =====
#define DHTPIN D4
#define DHTTYPE DHT22
DHT dht(DHTPIN, DHTTYPE);

// ===== LEDS =====
#define GREEN_LED D5
#define RED_LED   D6

// ===== OLED 1.3" (I2C, SH1106, 128x64) — the only display now; LCD has been removed.
// Using U8g2 instead of Adafruit_SH110X/SSD1306 — those didn't initialize this specific
// module, but U8g2's SH1106 driver does. =====
U8G2_SH1106_128X64_NONAME_F_HW_I2C oled(U8G2_R0, /* reset=*/ U8X8_PIN_NONE);
bool oledFound = false;

#define TEMP_HISTORY_LEN 40
float tempHistory[TEMP_HISTORY_LEN];
int tempHistoryCount = 0;

// ===== Web Server =====
ESP8266WebServer server(80);
// WebSocket server runs on a separate port alongside the HTTP server, pushing live
// readings to the page instead of the page reloading itself every few seconds.
WebSocketsServer webSocket(81);

// ===== Variables =====
float temp = 0;
float hum = 0;
String ipAddress = "";

// ===== Threshold =====
const float TEMP_LIMIT = 30.0;

// ===== Calibration =====
// The DHT22 sits close to the ESP8266/LEDs on the breadboard, which run warm and skew the
// reading high relative to actual ambient temperature. Subtracted from every raw reading
// before it's used anywhere (display, LED threshold check, and the value posted to ChainSight).
const float TEMP_CALIBRATION_OFFSET = 3.0;

// ================= OLED STATUS HELPER (boot/connection messages) =================
// U8g2's setCursor(x, y) positions the text BASELINE at y, not the top-left corner
// (unlike Adafruit_GFX) — y values here are chosen with that in mind.
void oledStatus(const String& line1, const String& line2 = "") {
  if (!oledFound) return;
  oled.clearBuffer();
  oled.setFont(u8g2_font_6x10_tf);
  oled.setCursor(0, 8);
  oled.print("ChainSight Cold Chain");
  oled.drawHLine(0, 10, 128);
  oled.setCursor(0, 26);
  oled.print(line1);
  if (line2.length() > 0) {
    oled.setCursor(0, 40);
    oled.print(line2);
  }
  oled.sendBuffer();
}

// ================= WEB PAGE =================
// One static raw-string literal — nothing dynamic is spliced in server-side anymore.
// Live values arrive via WebSocket and are written into the page by the JS below,
// so there's no full-page reload (replacing the old <meta refresh>) and no risk of
// the raw-string-splice bug from earlier versions.
void handleRoot() {
  server.send(200, "text/html", R"rawliteral(<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Smart Cold Chain Monitor</title>
<style>
body {
  font-family: Arial;
  background: linear-gradient(120deg, #e0f7fa, #ffffff);
  text-align: center;
  padding: 20px;
}
.card {
  background: white;
  max-width: 400px;
  margin: auto;
  padding: 25px;
  border-radius: 15px;
  box-shadow: 0 0 15px rgba(0,0,0,0.2);
}
h1 { color: #00796B; }
.value {
  font-size: 32px;
  font-weight: bold;
  margin: 10px;
}
.safe { color: green; font-size: 20px; }
.warning { color: red; font-size: 20px; font-weight: bold; }
</style>
</head>
<body>
<div class='card'>
<h1>Cold Chain Monitor</h1>
<p>Temperature</p>
<div class='value'><span id="temp">--</span> &deg;C</div>
<p>Humidity</p>
<div class='value'><span id="hum">--</span> %</div>
<p id="statusMsg" class="safe">Waiting for first reading&hellip;</p>
<p id="connMsg" style="font-size:12px;color:#999;margin-top:15px;">Connecting&hellip;</p>
</div>
<script>
function connect() {
  var ws = new WebSocket('ws://' + location.hostname + ':81/');
  ws.onmessage = function(event) {
    var data = JSON.parse(event.data);
    document.getElementById('temp').textContent = data.temp.toFixed(1);
    document.getElementById('hum').textContent = data.hum.toFixed(1);
    var statusEl = document.getElementById('statusMsg');
    if (data.alert) {
      statusEl.className = 'warning';
      statusEl.innerHTML = '&#9888; HIGH TEMPERATURE ALERT';
    } else {
      statusEl.className = 'safe';
      statusEl.innerHTML = '&#10003; System Normal';
    }
    document.getElementById('connMsg').textContent =
      data.connected ? 'Connected to ChainSight' : 'Not connected to ChainSight';
  };
  ws.onclose = function() { setTimeout(connect, 2000); }; // auto-reconnect
}
connect();
</script>
</body>
</html>)rawliteral");
}

// ================= WEBSOCKET =================
void webSocketEvent(uint8_t clientId, WStype_t type, uint8_t* payload, size_t length) {
  if (type == WStype_CONNECTED) {
    Serial.print("WebSocket client connected, id=");
    Serial.println(clientId);
  } else if (type == WStype_DISCONNECTED) {
    Serial.print("WebSocket client disconnected, id=");
    Serial.println(clientId);
  }
}

void broadcastReading() {
  StaticJsonDocument<128> doc;
  doc["temp"] = temp;
  doc["hum"] = hum;
  doc["alert"] = temp >= TEMP_LIMIT;
  doc["connected"] = accessToken.length() > 0;
  String json;
  serializeJson(doc, json);
  webSocket.broadcastTXT(json);
}

// ================= WIFI CONNECT =================
bool connectWiFi() {
  WiFi.mode(WIFI_STA);
  WiFi.persistent(false);
  WiFi.setAutoReconnect(true);

  WiFi.disconnect();
  delay(1000);

  Serial.println("\nScanning WiFi...");
  int n = WiFi.scanNetworks();
  for (int i = 0; i < n; i++) {
    Serial.println(WiFi.SSID(i));
  }

  WiFi.begin(ssid, password);

  Serial.println("Connecting to WiFi...");
  oledStatus("Connecting WiFi...");

  int timeout = 0;

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
    timeout++;

    if (timeout > 40) { // 20 sec timeout
      Serial.println("\nWiFi FAILED!");
      oledStatus("WiFi FAILED");
      return false;
    }
  }

  Serial.println("\nWiFi Connected!");
  ipAddress = WiFi.localIP().toString();
  Serial.println(ipAddress);

  oledStatus("WiFi Connected", ipAddress);

  return true;
}

// ================= CHAINSIGHT LOGIN =================
bool chainSightLogin() {
  WiFiClient wifiClient;
  HTTPClient http;
  http.begin(wifiClient, String(API_BASE) + "/auth/login/");
  http.addHeader("Content-Type", "application/json");
  String body = String("{\"credential\":\"") + CREDENTIAL + "\",\"password\":\"" + API_PASSWORD + "\"}";
  int code = http.POST(body);
  bool ok = false;
  if (code == 200) {
    StaticJsonDocument<1024> doc;
    if (deserializeJson(doc, http.getString()) == DeserializationError::Ok) {
      accessToken = doc["access"].as<String>();
      ok = accessToken.length() > 0;
    }
  } else {
    Serial.print("ChainSight login failed, HTTP code: ");
    Serial.println(code);
  }
  http.end();
  return ok;
}

// ================= CHAINSIGHT POST =================
void chainSightPost(float t, float h) {
  if (accessToken.length() == 0) {
    chainSightLogin();
    if (accessToken.length() == 0) return;
  }
  WiFiClient wifiClient;
  HTTPClient http;
  http.begin(wifiClient, String(API_BASE) + "/iot/storage/");
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Authorization", "Bearer " + accessToken);
  String body = String("{\"facility\":") + FACILITY_ID +
                ",\"temperature_celsius\":" + String(t, 1) +
                ",\"humidity_percent\":" + String(h, 1) + "}";
  int code = http.POST(body);
  lastPostHttpCode = code;
  Serial.print("POST /iot/storage/ -> ");
  Serial.println(code);
  if (code == 401) {
    Serial.println("Token expired — re-logging in.");
    chainSightLogin();
  }
  http.end();
}

// ================= OLED TREND GRAPH =================
void pushTempHistory(float t) {
  if (tempHistoryCount < TEMP_HISTORY_LEN) {
    tempHistory[tempHistoryCount++] = t;
  } else {
    // shift left, drop oldest
    for (int i = 1; i < TEMP_HISTORY_LEN; i++) tempHistory[i - 1] = tempHistory[i];
    tempHistory[TEMP_HISTORY_LEN - 1] = t;
  }
}

void drawOled() {
  if (!oledFound) return;
  oled.clearBuffer();

  // Header
  oled.setFont(u8g2_font_6x10_tf);
  oled.setCursor(0, 8);
  oled.print("ChainSight Cold Chain");
  oled.drawHLine(0, 10, 128);

  // Big current reading
  oled.setFont(u8g2_font_logisoso16_tr);
  oled.setCursor(0, 28);
  oled.print(temp, 1);
  oled.print(" C"); // plain "C" — avoids degree-symbol font-encoding issues

  // Humidity + status, back to the small font
  oled.setFont(u8g2_font_6x10_tf);
  oled.setCursor(0, 40);
  oled.print("Humidity: ");
  oled.print(hum, 0);
  oled.print("%");

  oled.setCursor(0, 51);
  if (temp >= TEMP_LIMIT) {
    oled.print("!! BREACH ALERT !!");
  } else {
    oled.print(accessToken.length() > 0 ? "ChainSight: OK" : "ChainSight: --");
  }

  // Mini trend graph along the bottom 10px (y=54..63), 40 points stretched across 128px
  int graphTop = 54, graphHeight = 9, graphLeft = 0, graphWidth = 127;
  oled.drawFrame(graphLeft, graphTop, graphWidth + 1, graphHeight + 1);
  if (tempHistoryCount > 1) {
    float minT = tempHistory[0], maxT = tempHistory[0];
    for (int i = 1; i < tempHistoryCount; i++) {
      if (tempHistory[i] < minT) minT = tempHistory[i];
      if (tempHistory[i] > maxT) maxT = tempHistory[i];
    }
    if (maxT - minT < 1.0) { maxT += 0.5; minT -= 0.5; } // avoid a flat divide-by-zero line
    int prevX = -1, prevY = -1;
    for (int i = 0; i < tempHistoryCount; i++) {
      int x = graphLeft + (int)((float)i / (TEMP_HISTORY_LEN - 1) * graphWidth);
      int y = graphTop + graphHeight - (int)((tempHistory[i] - minT) / (maxT - minT) * (graphHeight - 2)) - 1;
      if (prevX >= 0) oled.drawLine(prevX, prevY, x, y);
      prevX = x; prevY = y;
    }
  }

  oled.sendBuffer();
}

// ================= SETUP =================
void setup() {
  Serial.begin(115200);

  pinMode(GREEN_LED, OUTPUT);
  pinMode(RED_LED, OUTPUT);

  digitalWrite(GREEN_LED, LOW);
  digitalWrite(RED_LED, LOW);

  // I2C bus for the OLED (LCD removed — no longer sharing this bus with anything else)
  Wire.begin(D2, D1);
  delay(100); // let the OLED's power-on reset settle before the first I2C transaction

  oled.begin(); // U8g2's SH1106 driver — confirmed working on this module (Adafruit's wasn't)
  oledFound = true;
  Serial.println("OLED initialized (U8g2 SH1106 driver).");
  oledStatus("Cold Chain Init...");

  // WiFi connect
  if (!connectWiFi()) {
    oledStatus("Check Network!");
  } else {
    oledStatus("Logging in...");
    if (chainSightLogin()) {
      lastLogin = millis();
      oledStatus("ChainSight OK");
    } else {
      oledStatus("ChainSight FAIL");
    }
  }

  // DHT
  dht.begin();

  // Web server
  server.on("/", handleRoot);
  server.begin();

  // WebSocket server (separate port, pushes live readings to the page)
  webSocket.begin();
  webSocket.onEvent(webSocketEvent);
}

// ================= LOOP =================
void loop() {
  server.handleClient();
  webSocket.loop();

  unsigned long now = millis();
  if (accessToken.length() > 0 && now - lastLogin > RELOGIN_INTERVAL_MS) {
    chainSightLogin();
    lastLogin = now;
  }

  float t = dht.readTemperature();
  float h = dht.readHumidity();

  if (!isnan(t) && !isnan(h)) {
    temp = t - TEMP_CALIBRATION_OFFSET;
    hum = h;
    pushTempHistory(t);

    // LED control
    if (temp >= TEMP_LIMIT) {
      digitalWrite(RED_LED, HIGH);
      digitalWrite(GREEN_LED, LOW);
    } else {
      digitalWrite(GREEN_LED, HIGH);
      digitalWrite(RED_LED, LOW);
    }

    drawOled();
    broadcastReading(); // push the new reading to any connected browser tabs immediately

    // Post to ChainSight every POST_INTERVAL_MS
    if (now - lastPost >= POST_INTERVAL_MS) {
      lastPost = now;
      chainSightPost(temp, hum);
    }

  } else {
    Serial.println("DHT ERROR");
    oledStatus("Sensor Error");
  }

  delay(2000);
}
