// TODO: Set to client ID and API key from the Developer Console
const CLIENT_ID =
  "406276320276-ke1hoc8f8av523bai2d560sbjn06oe95.apps.googleusercontent.com";
const API_KEY = "AIzaSyCoXQmuw3u0joy8K8CypRGhcJLwGEy4cU4";
console.log("CLIENT_ID", CLIENT_ID);

// Discovery doc URL for APIs used by the quickstart
const DISCOVERY_DOC =
  "https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest";

// Authorization scopes required by the API; multiple scopes can be
// included, separated by spaces.

const SCOPES =
  "https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events.readonly https://www.googleapis.com/auth/calendar.events";

let tokenClient;
let gapiInited = false;
let gisInited = false;

document.getElementById("authorize_button").style.visibility = "hidden";
document.getElementById("signout_button").style.visibility = "hidden";

/**
 * Callback after api.js is loaded.
 */
function gapiLoaded() {
  gapi.load("client", initializeGapiClient);
  console.log("loaded");
}

/**
 * Callback after the API client is loaded. Loads the
 * discovery doc to initialize the API.
 */

async function initializeGapiClient() {
  await gapi.client.init({
    apiKey: API_KEY,
    discoveryDocs: [DISCOVERY_DOC],
  });
  gapiInited = true;
  maybeEnableButtons();
}

/**
 * Callback after Google Identity Services are loaded.
 */
function gisLoaded() {
  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: SCOPES,
    callback: "", // defined later
  });
  gisInited = true;
  maybeEnableButtons();
}

/**
 * Enables user interaction after all libraries are loaded.
 */
function maybeEnableButtons() {
  if (gapiInited && gisInited) {
    document.getElementById("authorize_button").style.visibility = "visible";
  }
}

/**
 *  Sign in the user upon button click.
 */
function handleAuthClick() {
  console.log("handle1");

  tokenClient.callback = async (resp) => {
    if (resp.error !== undefined) {
      throw resp;
    }
    console.log("handle2");
    document.getElementById("signout_button").style.visibility = "visible";
    document.getElementById("authorize_button").innerText = "Refresh";
  };

  if (gapi.client.getToken() === null) {
    // Prompt the user to select a Google Account and ask for consent to share their data
    // when establishing a new session.
    tokenClient.requestAccessToken({ prompt: "consent" });
  } else {
    console.log("handle4");
    // Skip display of account chooser and consent dialog for an existing session.
    tokenClient.requestAccessToken({ prompt: "" });
  }
  console.log("handle5");
}

/**
 *  Sign out the user upon button click.
 */
function handleSignoutClick() {
  const token = gapi.client.getToken();
  if (token !== null) {
    google.accounts.oauth2.revoke(token.access_token);
    gapi.client.setToken("");
    document.getElementById("content").innerText = "";
    document.getElementById("authorize_button").innerText = "Authorize";
    document.getElementById("signout_button").style.visibility = "hidden";
  }
}

// async function listUpcomingEvents(showHiddenInvitations = false) {
//   let response;
//   try {
//     const now = new Date();
//     const oneWeekAgo = new Date();
//     oneWeekAgo.setDate(now.getDate() - 7);
//     const request = {
//       calendarId:
//         "6fc2dab0bb8f3d17da94604be495d28b333a5a046098dcc1681940f0723ae33f@group.calendar.google.com",
//       timeMin: oneWeekAgo.toISOString(),
//       timeMax: now.toISOString(),
//       showDeleted: false,
//       singleEvents: true,
//       maxResults: 10,
//       orderBy: "startTime",
//       // showHiddenInvitations: showHiddenInvitations,
//     };
//     response = await gapi.client.calendar.events.list(request);
//   } catch (err) {
//     document.getElementById("content").innerText = err.message;
//     return;
//   }

//   const events = response.result.items;

//   if (!events || events.length == 0) {
//     document.getElementById("content").innerText = "No events found.";
//     return;
//   }

//   const groupedEvents = events.reduce((grouped, event) => {
//     const eventName = event.summary || "No title";
//     if (!grouped[eventName]) {
//       grouped[eventName] = [];
//     }
//     const start = moment(event.start.dateTime || event.start.date);
//     const end = moment(event.end.dateTime || event.end.date);
//     const duration = moment.duration(end.diff(start)).asHours();
//     grouped[eventName].push(
//       `${eventName} (Start: ${start.format(
//         "YYYY-MM-DD HH:mm:ss"
//       )}, End: ${end.format(
//         "YYYY-MM-DD HH:mm:ss"
//       )}, Duration: ${duration.toFixed(2)} hours)`
//     );
//     return grouped;
//   }, {});

//   // Flatten to string to display
//   const output = Object.keys(groupedEvents).reduce(
//     (str, eventName) =>
//       `${str}${eventName}:\n${groupedEvents[eventName].join("\n")}\n`,
//     "Events:\n"
//   );
//   document.getElementById("content").innerText = output;
// }

async function listUpcomingEvents(showHiddenInvitations = false) {
  try {
    const allCalendarIdsResponse =
      await gapi.client.calendar.calendarList.list();
    const allCalendarIds = allCalendarIdsResponse.result.items.map(
      (item) => item.id
    );

    let allEvents = [];

    for (let calendarId of allCalendarIds) {
      const now = new Date();
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(now.getDate() - 7);
      const request = {
        calendarId: calendarId,
        timeMin: oneWeekAgo.toISOString(),
        timeMax: now.toISOString(),
        showDeleted: false,
        singleEvents: true,
        maxResults: 10,
        orderBy: "startTime",
      };

      let response;
      try {
        response = await gapi.client.calendar.events.list(request);
      } catch (err) {
        console.error(
          `Error fetching events for calendar ID: ${calendarId}. Error: ${err.message}`
        );
        continue; // Skip to the next calendar ID if there's an error
      }

      if (response.result.items && response.result.items.length > 0) {
        allEvents.push(...response.result.items);
      }
    }

    if (!allEvents || allEvents.length == 0) {
      document.getElementById("content").innerText = "No events found.";
      return;
    }

    const groupedEvents = allEvents.reduce((grouped, event) => {
      const eventName = event.summary || "No title";
      if (!grouped[eventName]) {
        grouped[eventName] = [];
      }
      const start = moment(event.start.dateTime || event.start.date);
      const end = moment(event.end.dateTime || event.end.date);
      const duration = moment.duration(end.diff(start)).asHours();
      grouped[eventName].push(
        `${eventName} (Start: ${start.format(
          "YYYY-MM-DD HH:mm:ss"
        )}, End: ${end.format(
          "YYYY-MM-DD HH:mm:ss"
        )}, Duration: ${duration.toFixed(2)} hours)`
      );
      return grouped;
    }, {});

    const output = Object.keys(groupedEvents).reduce(
      (str, eventName) =>
        `${str}${eventName}:\n${groupedEvents[eventName].join("\n")}\n`,
      "Events:\n"
    );
    document.getElementById("content").innerText = output;
  } catch (err) {
    document.getElementById("content").innerText =
      "Error fetching calendar IDs: " + err.message;
    return;
  }
}

function insertEvent() {
  var event = {
    summary: "Test for google Calendar",
    start: {
      dateTime: "2023-07-28T09:00:00-07:00",
      timeZone: "America/Los_Angeles",
    },
    end: {
      dateTime: "2023-07-28T17:00:00-07:00",
      timeZone: "America/Los_Angeles",
    },
    reminders: {
      useDefault: false,
      overrides: [
        { method: "email", minutes: 24 * 60 },
        { method: "popup", minutes: 10 },
      ],
    },
  };

  var request = gapi.client.calendar.events.insert({
    calendarId: "primary",
    resource: event,
  });

  request.execute(function (event) {
    appendPre("Event created: " + event.htmlLink);
  });
}

document
  .getElementById("authorize_button")
  .addEventListener("click", handleAuthClick);
document
  .getElementById("signout_button")
  .addEventListener("click", handleSignoutClick);

document.getElementById("insert_button").addEventListener("click", insertEvent);

document
  .getElementById("list_events_button")
  .addEventListener("click", function () {
    listUpcomingEvents();
  });
