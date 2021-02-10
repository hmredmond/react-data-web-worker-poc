import { exposeWorker } from "react-hooks-worker";

const fib = (i) => (i <= 1 ? i : fib(i - 1) + fib(i - 2));

const gql = require("graphql-tag");
const { SubscriptionClient } = require("subscriptions-transport-ws");
var WebSocketClient = require("websocket").client;
const { openDB } = require("idb/with-async-ittr.js");

const subscribeToMatch = async (id) => {
  console.log("in subscribe", id);
  try {
    const matchId = id && id !== undefined ? parseInt(id) : 0; //await getFirstMatchId();

    console.log(matchId);
    const wsclient = new SubscriptionClient(
      "wss://live-api.staging.statsbomb.com/v1/graphql",
      {
        reconnect: true,
      },
      WebSocketClient
    );
    wsclient
      .request({
        query: gql`
          subscription MyMatchSubscription($matchId: Int!) {
            live_match_event(
              where: { match_id: { _eq: $matchId } }
              order_by: { part_id: desc, index: desc }
            ) {
              index
              id
              name
              team_id
              player_id
              timestamp
            }
          }
        `,
        variables: { matchId },
      })
      .subscribe({
        next: (response) => {
          console.log(response);

          //do DB stuff here
          updateDB(matchId, response);
        },
        error: console.error,
      });
  } catch (err) {
    console.error(err);
  }
};

subscribeToMatch(124300);

const updateDB = async (matchId, data) => {
  const db = await openDB("Matches", 1, {
    upgrade(db) {
      // Create a store of objects
      const store = db.createObjectStore("matches", {
        // The 'id' property of the object will be the key.
        keyPath: "matchId",
      });
      // Create an index on the 'date' property of the objects.
      store.createIndex("matchId", "matchId");
    },
  });

  // Add an article:
  await db.add("matches", {
    matchId: matchId,
    data: data,
  });
};

onmessage = (e) => {
  const { id } = e.data;

  const startTime = new Date().getTime();
  const response = subscribeToMatch(id);

  postMessage({
    response,
    time: new Date().getTime() - startTime,
  });
};
