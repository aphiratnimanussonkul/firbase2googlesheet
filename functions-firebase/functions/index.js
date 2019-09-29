"use strict";

const functions = require("firebase-functions");

// Firebase Admin initialization----=
var admin = require("firebase-admin");
var serviceAccount = require("./service-account.json");
let countIndex = 0;
let lastRow;
let lastCol;
let countRow = 2;
let ward = ["Ward7", "Ward9", "Ward10", "Ward11"];
let colStart = ["Student!A", "Student!B", "Student!C", "Student!D"];
let colStop = [":A", ":B", ":C", ":D"];
let checkOff = 0;
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://fir-sheet-9cb79.firebaseio.com"
});

// Get Google Sheets instance
const { google } = require("googleapis");
const sheets = google.sheets("v4");

// Create JWT
const jwtClient = new google.auth.JWT({
  email: serviceAccount.client_email,
  key: serviceAccount.private_key,
  scopes: ["https://www.googleapis.com/auth/spreadsheets"] // read and write sheets
});

// Get data from RTDB
exports.copyStudentToSheet = functions.database
  .ref("/Student")
  .onUpdate(async change => {
    let checkColName = false;
    let data = change.after.val();
    var lastKey = Object.keys(data)[Object.keys(data).length - 1];
    let tempKeyData = String(lastKey);
    for (let i = 0; i < 4; i++) {
      if (tempKeyData.includes(ward[i])) {
        //found
        checkColName = true;
        countIndex = i;
      }
    }
    if (data[lastKey] === "OFF") {
      checkOff += countIndex + 1;
    }
    if (lastRow === countRow && lastCol >= countIndex) {
      countRow++;
      checkOff = 0;
    }
    if (checkColName) {
      var itemArray = [];
      var valueArray = [];
      // Object.keys(data).forEach((key, index) => {
      // lastIndex = index;
      // lastKey = key;
      // itemArray.push(key);
      // var index = data.length - 1;
      // itemArray.push(data[lastKey]);
      // valueArray[index] = itemArray;
      // itemArray = [];
      // });
      // process.stdout.write(lastKey + "tempKey" + tempKeyData)
      if (checkOff === 10) {
        itemArray.push(data[lastKey] + "End");
        checkOff = 0;
      } else {
        itemArray.push(data[lastKey]);
      }
      valueArray[0] = itemArray;
      itemArray = [];
      // let maxRange = valueArray.length + 1;
      // Do authorization
      await jwtClient.authorize();

      // Create Google Sheets request
      let request = {
        auth: jwtClient,
        spreadsheetId: "1W06ph4_68mKiPO1HyDqP7Zuhg27cZ9Z4xiqfsH3u834",
        range: colStart[countIndex] + countRow + colStop[countIndex] + countRow,
        valueInputOption: "RAW",
        requestBody: {
          values: valueArray
        }
      };
      // Update data to Google Sheets
      await sheets.spreadsheets.values.update(request, {});

      
      if (checkOff === 10) {
        checkOff = lastCol = 0;
        lastRow = countRow = 2;
        countIndex = 0;
      } else {
        lastRow = countRow;
        lastCol = countIndex;
        countIndex++;
        if (countIndex >= 4) {
          checkOff = 0;
          countRow++;
          countIndex = 0;
        }
      }

    }
  });
