/**
 * prepared-for-the-weather.js
 * Simple mock module for testing demo
 */

export const doINeed = {
  umbrella: (data) => data.rainFall > 0,
  suncream: (data) => data.maxTemp > 25 && data.cloudCover < 30,
  jumper: (data) => data.minTemp < 15,
  water: () => true
};
