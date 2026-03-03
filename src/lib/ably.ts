import Ably from "ably";

let ablyInstance: Ably.Rest | null = null;

export function getAblyRest(): Ably.Rest {
  if (!ablyInstance) {
    const apiKey = process.env.ABLY_API_KEY;
    if (!apiKey) {
      throw new Error("ABLY_API_KEY is not set");
    }
    ablyInstance = new Ably.Rest({ key: apiKey });
  }
  return ablyInstance;
}

export const ABLY_CHANNEL_SELECTION = (galleryId: string) =>
  `gallery:${galleryId}:selection`;
