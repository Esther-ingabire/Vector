// Standalone I2C bus scanner — tells you definitively which addresses are actually
// responding on the bus (LCD and OLED should both show up, e.g. 0x27 and 0x3C/0x3D).
// Use this whenever a device "isn't found" to rule code out and see what's really there.
#include <Wire.h>

void setup() {
  Serial.begin(115200);
  delay(500);
  Wire.begin(D2, D1);  // SDA, SCL — same pins as the main sketch
  Serial.println("\nI2C Scanner starting...");
}

void loop() {
  int found = 0;
  Serial.println("Scanning...");
  for (byte address = 1; address < 127; address++) {
    Wire.beginTransmission(address);
    byte error = Wire.endTransmission();
    if (error == 0) {
      Serial.print("Device found at address 0x");
      if (address < 16) Serial.print("0");
      Serial.println(address, HEX);
      found++;
    }
  }
  if (found == 0) {
    Serial.println("No I2C devices found at all — check power (VCC/GND) first.");
  } else {
    Serial.print(found);
    Serial.println(" device(s) found.");
  }
  delay(3000);
}
