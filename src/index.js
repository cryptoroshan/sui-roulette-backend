const http = require("http");
const express = require('express');
const { Server } = require("socket.io");
const { GameStages, ValueType } = require("./global");
const { Timer } = require("easytimer.js");
const cors = require('cors');

//db
const db = require('./config/db');

const api = require("./api");
const User = require('./models/user');

/** Server Handling */
const app = express();
app.use(cors());
app.use(express.json());
app.use("/api", api);

const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: "*"
  }
});

// DB connect
db.mongoose
  .connect(db.url, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
  .then(() => {
    console.log("Connected to the database!");
  })
  .catch(err => {
    console.log("Cannot connect to the database!", err);
    process.exit();
  });


let timer = new Timer();
let users = new Map()
let gameData = {};
let usersData = {};
let wins = [];
let incomes = [];
let balances = [];
timer.addEventListener('secondsUpdated', function (e) {
  let currentSeconds = timer.getTimeValues().seconds;
  gameData.time_remaining = currentSeconds
  
  if (currentSeconds == 1) {
    console.log("Place bet");
    usersData = new Map()
    gameData.stage = GameStages.PLACE_BET
    wins = []
    sendStageEvent(gameData)
  } else if (currentSeconds == 25) {
    gameData.stage = GameStages.NO_MORE_BETS
    gameData.value = getRandomNumberInt(0, 36);
    console.log("No More Bets")
    sendStageEvent(gameData)

    for(let key of Array.from( usersData.keys()) ) {
      let username = users.get(key);

      console.log(username);

      if (username != undefined) {
        let chipsPlaced = usersData.get(key)

        let i = 0;
        let bettedSum = 0;

        for(i = 0; i < chipsPlaced.length; i++){
          bettedSum += chipsPlaced[i].sum;
        }

        let sumWon = calculateWinnings(gameData.value, chipsPlaced);
        wins.push({
            username: username,
            sum: sumWon
        });

        console.log('bet:' + bettedSum);
        console.log('total:' + sumWon);
        console.log('balances: ');
        console.log(balances);

        for(i = 0; i < balances.length; i++ )
        {
          if(balances[i].username == username)
          {
            if (balances[i].value - bettedSum >= bettedSum * 0.02) {
              balances[i].value -= bettedSum * 1.02;
            } else {
              balances[i].value = 0;
            }
            balances[i].value += sumWon;

            if (sumWon > bettedSum) {
              updateRowWL(username, balances[i].value, bettedSum, 'win');
            } else {
              updateRowWL(username, balances[i].value, bettedSum, 'lost');
            }

            sendHbar_Of_Bet(bettedSum * 0.02);
          }
        }
      }
    }

  } else if (currentSeconds == 35) {
    console.log("Winners")
    gameData.stage = GameStages.WINNERS
    // sort winners desc
    if (gameData.history == undefined) {
      gameData.history = []
    } 
    gameData.history.push(gameData.value)

    if (gameData.history.length > 10) {
      gameData.history.shift();
    }
    gameData.wins = wins.sort((a,b) => b.sum - a.sum);
    gameData.balances = balances;
    sendStageEvent(gameData)
  }

});

io.on("connection", (socket) => {

  socket.on('enter', async(data) => {
    let existed = false;
    console.log('WALLET ID:', data);
    users.set(socket.id, data);

    const _userInfo = await User.findOne({ wallet_address: data });
    if(_userInfo === null){
      return;
    }
    if(balances.length > 0){
      for( i = 0; i < balances.length; i++ ){
        if(balances[i].wallet_address == data){
          existed = true;
        }
      }
    }
    if( !existed ){
      balances.push({
        wallet_address: _userInfo.wallet_address,
        balance: parseFloat(_userInfo.balance)
      })
    }

    gameData.balances = balances;
    sendStageEvent(gameData);
  });

  socket.on('place-bet', (data) => {
    console.log('Server: Place-Bet');
    let chipData = JSON.parse(data)
    usersData.set(socket.id, chipData)
  });
  socket.on('deposit', (wallet_address, data) => {
    let i = 0;
    for( i = 0; i < balances.length; i++ ){
      if(balances[i].wallet_address == wallet_address){
        balances[i].balance += data;
      }
    }
    // deposit(name, data);
    gameData.balances = balances;
  });
  socket.on('refund', (wallet_address) => {
    let i = 0;
    console.log('refund: ' + wallet_address);
    for( i = 0; i < balances.length; i++ ){
      if(balances[i].wallet_address == wallet_address){
        balances[i].balance = 0;
      }
    }

    // refund(name);
    gameData.balances = balances;
  });
  socket.on("disconnect", (reason) => {
    users.delete(socket.id);
    usersData.delete(socket.id);
  });
});

httpServer.listen(3333, () =>{

  console.log(`Server is running on port 3333`);
  
  timer.start({precision: 'seconds'});
});

// app.listen(8000, () => {
//   console.log(`Server1 is running on port 8000`);
  
//   timer.start({precision: 'seconds'});
// });

function getRandomNumberInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function sendStageEvent(_gameData) { 
  let json = JSON.stringify(_gameData)
  console.log(json)
  io.emit('stage-change', json);
}

let blackNumbers = [ 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36 ];
let redNumbers = [ 1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29, 31, 33, 35 ];

function calculateWinnings(winningNumber, placedChips) {
  let win = 0;
  let arrayLength = placedChips.length;
  for (let i = 0; i < arrayLength; i++) {
     
      let placedChip = placedChips[i]
      let placedChipType = placedChip.item.type
      let placedChipValue = placedChip.item.value;
      let placedChipSum = placedChip.sum;
      let placedValueSplit = placedChip.item.valueSplit;
      
      if (placedChipType === ValueType.NUMBER &&  placedChipValue === winningNumber)
      {
          win += placedChipSum * 36;
      }
      else if (placedChipType === ValueType.DOUBLE_SPLIT &&  placedValueSplit !== undefined && placedValueSplit.indexOf(winningNumber) > -1)
      {
          win += placedChipSum * 17;
      }
      else if (placedChipType === ValueType.TRIPLE_SPLIT &&  placedValueSplit !== undefined && placedValueSplit.indexOf(winningNumber) > -1)
      {
          win += placedChipSum * 11;
      }
      else if (placedChipType === ValueType.QUAD_SPLIT &&  placedValueSplit !== undefined && placedValueSplit.indexOf(winningNumber) > -1)
      {
          win += placedChipSum * 8;
      }
      else if (placedChipType === ValueType.SIX_SPLIT &&  placedValueSplit !== undefined && placedValueSplit.indexOf(winningNumber) > -1)
      {
          win += placedChipSum * 5;
      }
      else if (placedChipType === ValueType.BLACK && blackNumbers.includes(winningNumber))
      { // if bet on black and win
          win += placedChipSum * 2;
      }
      else if (placedChipType === ValueType.RED && redNumbers.includes(winningNumber))
      { // if bet on red and win
          win += placedChipSum * 2;
      }
      else if (placedChipType === ValueType.NUMBERS_1_18 && (winningNumber >= 1 && winningNumber <= 18))
      { // if number is 1 to 18
          win += placedChipSum * 2;
      }
      else if (placedChipType === ValueType.NUMBERS_19_36 && (winningNumber >= 19 && winningNumber <= 36))
      { // if number is 19 to 36
          win += placedChipSum * 2;
      }
      else if (placedChipType === ValueType.NUMBERS_1_12 && (winningNumber >= 1 && winningNumber <= 12))
      { // if number is within range of row1
          win += placedChipSum * 3;
      }
      else if (placedChipType === ValueType.NUMBERS_2_12 && (winningNumber >= 13 && winningNumber <= 24))
      { // if number is within range of row2
          win += placedChipSum * 3;
      }
      else if (placedChipType === ValueType.NUMBERS_3_12 && (winningNumber >= 25 && winningNumber <= 36))
      { // if number is within range of row3
          win += placedChipSum * 3;
      }
      else if (placedChipType === ValueType.NUMBERS_1R_12 && ([3,6,9,12,15,18,21,24,27,30,33,36].indexOf(winningNumber) > -1))
      {
          win += placedChipSum * 3;
      }
      else if (placedChipType === ValueType.NUMBERS_2R_12 && ([2,5,8,11,14,17,20,23,26,29,32,35].indexOf(winningNumber) > -1))
      {
          win += placedChipSum * 3;
      }
      else if (placedChipType === ValueType.NUMBERS_3R_12 && ([1,4,7,10,13,16,19,22,25,28,31,34].indexOf(winningNumber) > -1))
      {
          win += placedChipSum * 3;
      }
      else if (placedChipType === ValueType.EVEN || placedChipType === ValueType.ODD)
      {
        if ( (winningNumber % 2 == 0 && placedChipType === ValueType.EVEN) || (winningNumber % 2 == 1 && placedChipType === ValueType.ODD) ) {
            win += placedChipSum * 2;
        }
      }
  }

  return win;
}