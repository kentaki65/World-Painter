import { maxHeight } from "./state.js";

export const clamp = (v) => {
  return Math.max(0, Math.min(255, v));
}

export const heightClamp = (v) => {
  return Math.max(0, Math.min(maxHeight, v));
}

export const lerp = (a, b, t) => { 
  return a + (b - a) * t; 
}


