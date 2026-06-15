import React from 'react';
import Svg, { Polygon, Circle, Line, Defs, LinearGradient, Stop, Filter, FeDropShadow } from 'react-native-svg';

export default function ChainSightLogo({ size = 56 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 60 60" fill="none">
      <Defs>
        <LinearGradient id="cs-g" x1="8" y1="3" x2="52" y2="57" gradientUnits="userSpaceOnUse">
          <Stop offset="0%" stopColor="#52c484" />
          <Stop offset="55%" stopColor="#1e7a46" />
          <Stop offset="100%" stopColor="#0f3d22" />
        </LinearGradient>
      </Defs>

      {/* Hexagon */}
      <Polygon
        points="30,3 53,16.5 53,43.5 30,57 7,43.5 7,16.5"
        fill="url(#cs-g)"
      />
      {/* Inner bevel */}
      <Polygon
        points="30,5.5 50.5,17.8 50.5,42.2 30,54.5 9.5,42.2 9.5,17.8"
        fill="none"
        stroke="rgba(255,255,255,0.14)"
        strokeWidth="1.2"
      />

      {/* Connecting lines */}
      <Line x1="30"  y1="18"   x2="20.5" y2="34.5" stroke="rgba(255,255,255,0.55)" strokeWidth="2.2" strokeLinecap="round" />
      <Line x1="30"  y1="18"   x2="39.5" y2="34.5" stroke="rgba(255,255,255,0.55)" strokeWidth="2.2" strokeLinecap="round" />
      <Line x1="20.5" y1="34.5" x2="39.5" y2="34.5" stroke="rgba(255,255,255,0.55)" strokeWidth="2.2" strokeLinecap="round" />

      {/* Nodes */}
      <Circle cx="30"   cy="18"   r="4.2" fill="white" />
      <Circle cx="20.5" cy="34.5" r="4.2" fill="white" />
      <Circle cx="39.5" cy="34.5" r="4.2" fill="white" />

      {/* Live indicator */}
      <Circle cx="30" cy="18" r="1.8" fill="#1e7a46" />
    </Svg>
  );
}
