import "leaflet/dist/leaflet.css";
import "./style.css";
import leaflet from "leaflet";
import luck from "./luck";
import "./leafletWorkaround";

const MERRILL_CLASSROOM = leaflet.latLng({
  lat: 36.9995,
  lng: -122.0533,
});

const GAMEPLAY_ZOOM_LEVEL = 19;
const TILE_DEGREES = 1e-4;
const NEIGHBORHOOD_SIZE = 8;
const PIT_SPAWN_PROBABILITY = 0.1;

const mapContainer = document.querySelector<HTMLElement>("#map")!;

const map = leaflet.map(mapContainer, {
  center: MERRILL_CLASSROOM,
  zoom: GAMEPLAY_ZOOM_LEVEL,
  minZoom: GAMEPLAY_ZOOM_LEVEL,
  maxZoom: GAMEPLAY_ZOOM_LEVEL,
  zoomControl: false,
  scrollWheelZoom: false,
});

leaflet
  .tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution:
      '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  })
  .addTo(map);

const playerMarker = leaflet.marker(MERRILL_CLASSROOM);
playerMarker.bindTooltip("That's you!");
playerMarker.addTo(map);

const sensorButton = document.querySelector("#sensor")!;
sensorButton.addEventListener("click", () => {
  navigator.geolocation.watchPosition((position) => {
    playerMarker.setLatLng(
      leaflet.latLng(position.coords.latitude, position.coords.longitude)
    );
    map.setView(playerMarker.getLatLng());
  });
});

let points = 0;
const statusPanel = document.querySelector<HTMLDivElement>("#statusPanel")!;
statusPanel.innerHTML = "No points yet...";

function makePit(i: number, j: number, seed: string) {
  const bounds = leaflet.latLngBounds([
    [
      MERRILL_CLASSROOM.lat + i * TILE_DEGREES,
      MERRILL_CLASSROOM.lng + j * TILE_DEGREES,
    ],
    [
      MERRILL_CLASSROOM.lat + (i + 1) * TILE_DEGREES,
      MERRILL_CLASSROOM.lng + (j + 1) * TILE_DEGREES,
    ],
  ]);

  const pit = leaflet.rectangle(bounds) as leaflet.Layer;

  let totalCoins = Math.floor(luck([i, j, seed, "totalCoins"].toString()) * 10);
  let remainingCoins = totalCoins;

  pit.bindPopup(() => {
    const container = document.createElement("div");

    container.innerHTML = `
      <div>There is a pit here at "${i},${j}". It contains <span id="coinValue">${remainingCoins}</span> coins.</div>
      <button id="collect">Collect coin</button>
      <button id="deposit">Deposit coin</button>`;

    const collectButton =
      container.querySelector<HTMLButtonElement>("#collect")!;
    const depositButton =
      container.querySelector<HTMLButtonElement>("#deposit")!;

    collectButton.addEventListener("click", () => {
      if (remainingCoins > 0) {
        points += 1;
        statusPanel.innerHTML = `${points} points accumulated`;
        remainingCoins--;

        container.innerHTML = `
          <div>There is a pit here at "${i},${j}". It contains <span id="coinValue">${remainingCoins}</span> coins.</div>
          <button id="collect">Collect coin</button>
          <button id="deposit">Deposit coin</button>`;

        if (remainingCoins === 0) {
          container.innerHTML += `<div>All coins collected from this pit.</div>`;
          collectButton.removeEventListener("click", () => {});
          depositButton.removeEventListener("click", () => {});
        }
      }
    });

    depositButton.addEventListener("click", () => {
      if (points > 0) {
        points -= 1;
        remainingCoins++;
        statusPanel.innerHTML = `${points} points accumulated`;

        container.innerHTML = `
          <div>There is a pit here at "${i},${j}". It contains <span id="coinValue">${remainingCoins}</span> coins.</div>
          <button id="collect">Collect coin</button>
          <button id="deposit">Deposit coin</button>`;
      }
    });

    return container;
  });

  pit.addTo(map);
}

// Generate cache locations around the player's initial location
function generateCacheLocations(seed: string) {
  for (let i = -NEIGHBORHOOD_SIZE; i < NEIGHBORHOOD_SIZE; i++) {
    for (let j = -NEIGHBORHOOD_SIZE; j < NEIGHBORHOOD_SIZE; j++) {
      const cacheSpawnProbability = luck([seed, i, j].toString());
      if (cacheSpawnProbability < PIT_SPAWN_PROBABILITY) {
        makePit(i, j, seed);
      }
    }
  }
}

// Use a seed value to generate cache locations and coins
const seed = "seed";
generateCacheLocations(seed);
