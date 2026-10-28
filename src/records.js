// Source records — the ONLY facts the Planner may use.
// Demo data: an exported snapshot of Outgrid destination records
// (5 countries x 16 cities), shipped under data/ as countries.json
// plus one cities-<country>.json per country.
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const DATA_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "data");

let cache = null;

export function loadData() {
  if (cache) return cache;
  const { meta, countries } = JSON.parse(readFileSync(join(DATA_DIR, "countries.json"), "utf8"));
  const cities = readdirSync(DATA_DIR)
    .filter((f) => f.startsWith("cities-") && f.endsWith(".json"))
    .sort()
    .flatMap((f) => JSON.parse(readFileSync(join(DATA_DIR, f), "utf8")));
  cache = { meta, countries, cities };
  return cache;
}

export function getCity(destinationId) {
  const city = loadData().cities.find((c) => c.id === destinationId);
  if (!city) throw new Error(`Unknown destination_id: ${destinationId}`);
  return city;
}

export function getCountry(countryId) {
  const country = loadData().countries.find((c) => c.id === countryId);
  if (!country) throw new Error(`Unknown country_id: ${countryId}`);
  return country;
}
