// Import necessary libraries and styles
import "leaflet/dist/leaflet.css";
import "./style.css";
import leaflet from "leaflet";
import luck from "./luck";
import "./leafletWorkaround";

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

// Declare a global array to store player's movement history
const playerMovementHistory: leaflet.LatLng[] = [];

// Create a polyline to represent the player's movement history
const playerMovementPolyline = leaflet
  .polyline(playerMovementHistory, {
    color: "#8B0000",
  })
  .addTo(map);

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
    const newLatLng = leaflet.latLng(
      position.coords.latitude,
      position.coords.longitude
    );
    playerMarker.setLatLng(newLatLng);
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
function makePit(
  i: number,
  j: number,
  seed: string,
  playerLatLng: leaflet.LatLng
) {
  const globalCoordinates = convertToGlobalCoordinates(
    playerLatLng.lat + i * TILE_DEGREES,
    playerLatLng.lng + j * TILE_DEGREES
  );

  const bounds = leaflet.latLngBounds([
    [playerLatLng.lat + i * TILE_DEGREES, playerLatLng.lng + j * TILE_DEGREES],
    [
      playerLatLng.lat + (i + 1) * TILE_DEGREES,
      playerLatLng.lng + (j + 1) * TILE_DEGREES,
    ],
  ]);

  const pit = leaflet.rectangle(bounds) as leaflet.Layer;

  // Add the pit layer to the cacheLayers array
  cacheLayers.push(pit);

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

        updatePopupContent();
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
  activeCaches.push(pit);
}

// Function to convert coordinates to global coordinates
const convertToGlobalCoordinates = (latitude: number, longitude: number) => {
  const latMultiplier = 10 ** 5;
  const lngMultiplier = 10 ** 5;

  const i = Math.round(latitude * latMultiplier);
  const j = Math.round(longitude * lngMultiplier);

  return { i, j };
};

// Declare a global array to store cache layers
const cacheLayers: leaflet.Layer[] = [];

// Array to store active caches on the map
const activeCaches: leaflet.Layer[] = [];

// Function to generate cache locations based on the initial positions relative to the player
function generateCacheLocations(playerLatLng: leaflet.LatLng) {
  const seed = "seed"; // You can use a fixed seed or a random seed here

  for (let i = -NEIGHBORHOOD_SIZE; i < NEIGHBORHOOD_SIZE; i++) {
    for (let j = -NEIGHBORHOOD_SIZE; j < NEIGHBORHOOD_SIZE; j++) {
      const cacheSpawnProbability = luck([seed, i, j].toString());

      // Calculate the global coordinates based on the player's position
      const globalCoordinates = convertToGlobalCoordinates(
        playerLatLng.lat + i * TILE_DEGREES,
        playerLatLng.lng + j * TILE_DEGREES
      );

      // Check if a cache already exists at this location
      const existingCache = activeCaches.find((cache) => {
        // Cast the layer to leaflet.Rectangle to use getBounds
        const rectangleCache = cache as leaflet.Rectangle;
        const cacheLatLng = rectangleCache.getBounds().getCenter();
        return (
          Math.round(cacheLatLng.lat * 1e5) === globalCoordinates.i &&
          Math.round(cacheLatLng.lng * 1e5) === globalCoordinates.j
        );
      });

      // If no existing cache and cache should spawn based on probability
      if (!existingCache && cacheSpawnProbability < PIT_SPAWN_PROBABILITY) {
        // Create a new cache
        makePit(i, j, seed, playerLatLng);
      }
    }
  }
}

function clearCachesOutsideNeighborhood(playerLatLng: leaflet.LatLng) {
  // Iterate through the activeCaches array and remove caches outside the updated neighborhood
  activeCaches.forEach((cache) => {
    // Cast the layer to leaflet.Rectangle to use getBounds
    const rectangleCache = cache as leaflet.Rectangle;
    const cacheLatLng = rectangleCache.getBounds().getCenter();

    // Calculate the difference in tiles between the cache and the player's current position
    const tileDifferenceX = Math.round(
      (cacheLatLng.lng - playerLatLng.lng) / TILE_DEGREES
    );
    const tileDifferenceY = Math.round(
      (cacheLatLng.lat - playerLatLng.lat) / TILE_DEGREES
    );

    // Check if the cache is outside the updated neighborhood
    if (
      Math.abs(tileDifferenceX) > NEIGHBORHOOD_SIZE ||
      Math.abs(tileDifferenceY) > NEIGHBORHOOD_SIZE
    ) {
      map.removeLayer(cache);

      // Remove the cache from the activeCaches array
      const cacheIndex = activeCaches.indexOf(cache);
      if (cacheIndex !== -1) {
        activeCaches.splice(cacheIndex, 1);
      }
    }
  });
}

// Function to find a cache based on global coordinates
function findCacheByGlobalCoordinates(
  i: number,
  j: number
): leaflet.Layer | undefined {
  return activeCaches.find((cache) => {
    // Cast the layer to leaflet.Rectangle to use getBounds
    const rectangleCache = cache as leaflet.Rectangle;
    const cacheLatLng = rectangleCache.getBounds().getCenter();
    return (
      Math.round(cacheLatLng.lat * 1e5) === i &&
      Math.round(cacheLatLng.lng * 1e5) === j
    );
  });
}

// Function to update the popup content of a cache
function updateCachePopup(cache: leaflet.Layer) {
  // Add your logic to update the popup content here
  cache;
}

function resetGame() {
  Object.values(globalInventory).forEach((coin) => {
    if (coin.collected) {
      const { i, j } = convertToGlobalCoordinates(
        playerMarker.getLatLng().lat,
        playerMarker.getLatLng().lng
      );
      const homeCache = findCacheByGlobalCoordinates(i, j);

      coin.collected = false;

      points -= 1;
      statusPanel.innerHTML = `${points} points accumulated`;

      // Update the popup content after depositing the coin
      if (homeCache) {
        updateCachePopup(homeCache);
      }
    }
  });

  // Step 2: Clear the player's movement history
  playerMovementHistory.length = 0;

  // Update the polyline with the cleared movement history
  playerMovementPolyline.setLatLngs(playerMovementHistory);

  // Step 3: Clear all active caches on the map
  activeCaches.forEach((cache) => map.removeLayer(cache));
  activeCaches.length = 0;

  // Step 4: Generate new cache locations based on the player's spawn location
  generateCacheLocations(playerMarker.getLatLng());

  // Step 5: Center the map on the player's initial location
  map.setView(playerMarker.getLatLng());
}

// Initial generation of cache's based on player's spawn location
generateCacheLocations(playerMarker.getLatLng());

// const playerInitialLocation = playerMarker.getLatLng();

// Add event listeners for each direction button
document
  .getElementById("north")!
  .addEventListener("click", () => movePlayer("north"));
document
  .getElementById("south")!
  .addEventListener("click", () => movePlayer("south"));
document
  .getElementById("east")!
  .addEventListener("click", () => movePlayer("east"));
document
  .getElementById("west")!
  .addEventListener("click", () => movePlayer("west"));

document.getElementById("reset")!.addEventListener("click", resetGame);

// Function to update the player's position based on the movement direction
function movePlayer(direction: string) {
  const delta = 0.0001; // Adjust as needed

  switch (direction) {
    case "north":
      playerMarker.setLatLng({
        lat: playerMarker.getLatLng().lat + delta,
        lng: playerMarker.getLatLng().lng,
      });
      break;
    case "south":
      playerMarker.setLatLng({
        lat: playerMarker.getLatLng().lat - delta,
        lng: playerMarker.getLatLng().lng,
      });
      break;
    case "east":
      playerMarker.setLatLng({
        lat: playerMarker.getLatLng().lat,
        lng: playerMarker.getLatLng().lng + delta,
      });
      break;
    case "west":
      playerMarker.setLatLng({
        lat: playerMarker.getLatLng().lat,
        lng: playerMarker.getLatLng().lng - delta,
      });
      break;
    default:
      break;
  }

  // Add the current player position to the movement history
  playerMovementHistory.push(playerMarker.getLatLng());

  // Update the polyline with the new movement history
  playerMovementPolyline.setLatLngs(playerMovementHistory);

  // Clear caches outside the updated neighborhood
  clearCachesOutsideNeighborhood(playerMarker.getLatLng());

  // Update the cache locations based on the new player position
  // generateCacheLocations(playerInitialLocation);
  map.setView(playerMarker.getLatLng());
}
