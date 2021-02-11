const gql = require("graphql-tag");
const ApolloClient = require("apollo-client").default;
const { WebSocketLink } = require("apollo-link-ws");
const apolloInMemoryCache = require("apollo-cache-inmemory");
const { InMemoryCache } = apolloInMemoryCache;
const { md5 } = require("hash-wasm");

const { get, set } = require("idb-keyval");

const subscribeToMatch = async (id) => {
  console.log("in subscribe", id);
  try {
    const matchId = id && id !== undefined ? parseInt(id) : 0; //await getFirstMatchId();
    if (matchId === undefined || matchId === 0) {
      postMessage("No Match Id found");
      return;
    } else {
      postMessage(`Match Id found:${matchId}`);
    }
    const query = gql`
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
          match_id
        }
      }
    `;

    const wsLink = new WebSocketLink({
      uri: "wss://live-api.staging.statsbomb.com/v1/graphql",
      options: {
        reconnect: true,
        connectionParams: {
          headers: {
            "x-hasura-admin-secret": "Gp6lU48bdbPhZ7G5",
          },
        },
      },
    });

    const apClient = new ApolloClient({
      link: wsLink,
      cache: new InMemoryCache({ addTypename: false }),

      defaultOptions: {
        watchQuery: {
          fetchPolicy: "no-cache",
        },
        query: {
          fetchPolicy: "no-cache",
        },
      },
    });
    apClient.query({ query: query, variables: { matchId } }).then((result) => {
      console.log("results with AP", result.data.live_match_event);
      updateDB(matchId, result.data.live_match_event);
    });
  } catch (err) {
    console.error(err);
  }
};

const updateDB = async (matchId, data) => {
  get(matchId).then((val) => {
    if (val === undefined || dataSetChange(val, data)) {
      set(matchId, data)
        .then(() => {
          console.log(`Updating: ${matchId}`);
          console.log("Worker: Posting message back to main script");
          postMessage({ dirty: true, matchId: matchId });
        })
        .catch((err) => console.log("It failed!", err));
    } else {
      console.log(`Did not update: ${matchId}`);
      console.log("Worker: Posting message back to main script");
      postMessage({ dirty: false, matchId: matchId });
    }
  });
};

onmessage = async (e) => {
  console.log("Worker: Message received from main script", e.data);
  if (e.data === undefined) return;
  await subscribeToMatch(e.data);
};

const dataSetChange = async (val, data) => {
  if (val === undefined) return true;
  const md5Val = await md5(val);
  const md5Data = await md5(data);
  return md5Val !== md5Data;
};
