// Import necessary libraries and styles
import "leaflet/dist/leaflet.css";
import "./style.css";
import leaflet from "leaflet";
import luck from "./luck";
import "./leafletWorkaround";
// import Cell from "./board";

// Constants
const MAP_CONTAINER_ID = "map";
const SENSOR_BUTTON_ID = "sensor";
const STATUS_PANEL_ID = "statusPanel";

// Declare global inventory at the top level
const globalInventory: { [key: string]: { id: number; collected: boolean } } =
  {};

// Define the initial location and zoom level
const MERRILL_CLASSROOM = leaflet.latLng({
  lat: 36.9995,
  lng: -122.0533,
});

const GAMEPLAY_ZOOM_LEVEL = 19;
const TILE_DEGREES = 1e-4;
const NEIGHBORHOOD_SIZE = 8;
const PIT_SPAWN_PROBABILITY = 0.1;

// Create the map
const mapContainer = document.querySelector<HTMLElement>(
  `#${MAP_CONTAINER_ID}`
)!;
const map = leaflet.map(mapContainer, {
  center: MERRILL_CLASSROOM,
  zoom: GAMEPLAY_ZOOM_LEVEL,
  minZoom: GAMEPLAY_ZOOM_LEVEL,
  maxZoom: GAMEPLAY_ZOOM_LEVEL,
  zoomControl: false,
  scrollWheelZoom: false,
});

// Add OpenStreetMap tiles to the map
leaflet
  .tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution:
      '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  })
  .addTo(map);

// Create a marker for the player
const playerMarker = leaflet.marker(MERRILL_CLASSROOM);
playerMarker.bindTooltip("That's you!");
playerMarker.addTo(map);

// Add a button to simulate sensor data
const sensorButton = document.querySelector(`#${SENSOR_BUTTON_ID}`)!;
sensorButton.addEventListener("click", () => {
  navigator.geolocation.watchPosition((position) => {
    playerMarker.setLatLng(
      leaflet.latLng(position.coords.latitude, position.coords.longitude)
    );
    map.setView(playerMarker.getLatLng());
  });
});

// Initialize points and status panel
let points = 0;
const statusPanel = document.querySelector<HTMLDivElement>(
  `#${STATUS_PANEL_ID}`
)!;
statusPanel.innerHTML = "No points yet...";

// Function to create a pit and handle popups
function makePit(i: number, j: number, seed: string) {
  // Use the Cell class to get or create a Cell instance for the given grid position
  // const gridCell = Cell.getCell(i, j);

  const globalCoordinates = convertToGlobalCoordinates(
    MERRILL_CLASSROOM.lat + i * TILE_DEGREES,
    MERRILL_CLASSROOM.lng + j * TILE_DEGREES
  );

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
  let coins: { id: number; collected: boolean }[] = Array.from(
    { length: totalCoins },
    (_, id) => ({ id, collected: false })
  );

  const updatePopupContent = () => {
    const pitInfo = document.querySelector(
      `#pit-${i}-${j} #pitInfo`
    ) as HTMLDivElement;
    totalCoins = coins.filter((coin) => !coin.collected).length;
    pitInfo.textContent = `There is a pit here at "${globalCoordinates.i},${globalCoordinates.j}". It contains ${totalCoins} coins.`;

    const coinsContainer = document.querySelector(
      `#pit-${i}-${j} #coinsContainer`
    ) as HTMLDivElement;
    coinsContainer.innerHTML = "";

    coins.forEach((coin) => {
      if (!coin.collected) {
        const coinElement = document.createElement("div");
        coinElement.innerHTML = `<span>${globalCoordinates.i}:${globalCoordinates.j}#${coin.id}</span>`;

        const collectButton = document.createElement("button");
        collectButton.textContent = "Collect coin";

        collectButton.addEventListener("click", () => {
          if (!coin.collected) {
            coin.collected = true;
            points += 1;
            statusPanel.innerHTML = `${points} points accumulated`;

            const globalCoinKey = `${globalCoordinates.i}-${globalCoordinates.j}-${coin.id}`;
            globalInventory[globalCoinKey] = coin;

            // Update the popup content after collecting the coin
            updatePopupContent();
          }
        });

        coinElement.appendChild(collectButton);
        coinsContainer.appendChild(coinElement);
      }
    });
  };

  pit.on("click", () => {
    const container = document.createElement("div");
    container.id = `pit-${i}-${j}`;

    container.innerHTML = `
      <div id="pitInfo">There is a pit here at "${globalCoordinates.i},${globalCoordinates.j}". It contains ${totalCoins} coins.</div>
      <button id="deposit">Deposit coin</button>
      <div id="coinsContainer"></div>`;

    const depositButton = container.querySelector(
      "#deposit"
    ) as HTMLButtonElement;

    depositButton.addEventListener("click", () => {
      const collectedCoins = Object.values(globalInventory).filter(
        (coin) => coin.collected
      );

      if (collectedCoins.length > 0) {
        const firstCollectedCoin = collectedCoins[0];
        firstCollectedCoin.collected = false;
        points -= 1;
        statusPanel.innerHTML = `${points} points accumulated`;

        // Update the popup content after depositing the coin
        updatePopupContent();

        // Close the popup after depositing the coin (optional)
        pit.closePopup();
      }
    });

    const coinsContainer = container.querySelector(
      "#coinsContainer"
    ) as HTMLDivElement;

    coins.forEach((coin) => {
      if (!coin.collected) {
        const coinElement = document.createElement("div");
        coinElement.innerHTML = `<span>${globalCoordinates.i}:${globalCoordinates.j}#${coin.id}</span>`;

        const collectButton = document.createElement("button");
        collectButton.textContent = "Collect coin";

        collectButton.addEventListener("click", () => {
          if (!coin.collected) {
            coin.collected = true;
            points += 1;
            statusPanel.innerHTML = `${points} points accumulated`;

            const globalCoinKey = `${globalCoordinates.i}-${globalCoordinates.j}-${coin.id}`;
            globalInventory[globalCoinKey] = coin;

            // Update the popup content after collecting the coin
            updatePopupContent();
          }
        });

        coinElement.appendChild(collectButton);
        coinsContainer.appendChild(coinElement);
      }
    });

    // Open the custom popup
    pit.bindPopup(container).openPopup();
  });

  pit.addTo(map);
}

// Function to convert coordinates to global coordinates
const convertToGlobalCoordinates = (latitude: number, longitude: number) => {
  const latMultiplier = 10 ** 5;
  const lngMultiplier = 10 ** 5;

  const i = Math.round(latitude * latMultiplier);
  const j = Math.round(longitude * lngMultiplier);

  return { i, j };
};

// Function to generate cache locations around the player's initial location
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
