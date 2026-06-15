/**
 * API Base URL Configuration
 *
 * Default is set to Android emulator localhost (10.0.2.2 maps to host machine's 127.0.0.1).
 *
 * To use with a physical device or a different host:
 *   - Replace '10.0.2.2' with your computer's local IP address (e.g., '192.168.1.42')
 *   - You can find your IP on Windows via: ipconfig → "IPv4 Address"
 *   - On macOS/Linux: ifconfig or ip addr
 *   - Make sure your phone and computer are on the same Wi-Fi network
 *
 * Example for physical device:
 *   export const API_BASE_URL = 'http://192.168.1.42:8000/api/v1';
 */
// Wi-Fi / hotspot IP of the dev PC (run `ipconfig` → "Wireless LAN adapter Wi-Fi" → IPv4)
// Current: PC connected to phone hotspot → 172.20.10.2
export const API_BASE_URL = 'http://172.20.10.2:8000/api/v1';
