export interface StocktakeLine {
  code: string;
  name: string;
  batch: string;
  expiryDate: string;
  manufactureDate: string;
  location: string;
  unitName: string;
  packSize: string;
  packsSnapshot: string;
  packsCounted: string;
  difference: string;
  reason: string;
  manufacturer: string;
}

export const stocktakeMeta = {
  number: 112,
  description: "Created by check on 30/06/2026",
};

/** Static rows captured from the live stocktake page (no interactivity). */
export const stocktakeLines: StocktakeLine[] = [
  ["70_2173", "AAS Lamp Shimadzu AA6880 - Hallow Cathode Beryllium"],
  ["72_2168", "AAS Lamp Shimadzu AA6880 - Hallow Cathode Lamp Aluminium"],
  ["72_2193", "AAS Lamp Shimadzu AA6880 - Hallow Cathode Lamp Antimony"],
  ["72_2169", "AAS Lamp Shimadzu AA6880 - Hallow Cathode Lamp Arsenic"],
  ["72_2172", "AAS Lamp Shimadzu AA6880 - Hallow Cathode Lamp Barium"],
  ["72_2174", "AAS Lamp Shimadzu AA6880 - Hallow Cathode Lamp Bismuth"],
  ["72_2171", "AAS Lamp Shimadzu AA6880 - Hallow Cathode Lamp Boron"],
  ["72_2176", "AAS Lamp Shimadzu AA6880 - Hallow Cathode Lamp Cadmium"],
  ["72_2179", "AAS Lamp Shimadzu AA6880 - Hallow Cathode Lamp Copper"],
  ["72_2170", "AAS Lamp Shimadzu AA6880 - Hallow Cathode Lamp Gold"],
  ["72_2182", "AAS Lamp Shimadzu AA6880 - Hallow Cathode Lamp Lanthanum"],
  ["72_2189", "AAS Lamp Shimadzu AA6880 - Hallow Cathode Lamp Lead"],
  ["72_2183", "AAS Lamp Shimadzu AA6880 - Hallow Cathode Lamp Lithium"],
  ["72_2184", "AAS Lamp Shimadzu AA6880 - Hallow Cathode Lamp Magnesium"],
  ["72_2185", "AAS Lamp Shimadzu AA6880 - Hallow Cathode Lamp Manganese"],
  ["72_2186", "AAS Lamp Shimadzu AA6880 - Hallow Cathode Lamp Molybdenum"],
  ["72_2188", "AAS Lamp Shimadzu AA6880 - Hallow Cathode Lamp Nickel"],
  ["72_2190", "AAS Lamp Shimadzu AA6880 - Hallow Cathode Lamp Palladium"],
].map(([code, name]) => ({
  code,
  name,
  batch: "",
  expiryDate: "",
  manufactureDate: "",
  location: "",
  unitName: "Each",
  packSize: "-",
  packsSnapshot: "0",
  difference: "-",
  packsCounted: "0",
  reason: "",
  manufacturer: "",
}));
