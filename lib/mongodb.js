import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
const options = {};

if (!uri) {
  console.warn("MONGODB_URI is not configured. Database routes will return a setup error.");
}

let client;
let clientPromise;

if (uri) {
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

export async function getDb() {
  if (!clientPromise) throw new Error("MONGODB_URI is not configured");
  const connectedClient = await clientPromise;
  return connectedClient.db();
}
