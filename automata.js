/*

  Generative Automata w/ Web MIDI
  ==============================
  - Built for the Novation LaunchPad MK2 by George Mandis (george.mand.is)
  - Generative code taken from Tero Parviainen's (teropa.info) slides as seen at Fullstack London 2017 (teropa.info/generative-music-slides/)
  - Additional inspiration from Chris Wilsons's (cwilso.com) Conway's Game of Life demo for Web MIDI and Novation Launchpad (webaudiodemos.appspot.com/conway/index.html)
  - For more information visit: midi.mand.is

*/

const generations = [
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0]
  ],
  rules = {},
  colorOffset = Math.floor(Math.random() * 60)

const updateRules = () => {
  document.querySelectorAll("input").forEach((rule, index) => {
    let key = rule.name.replace(/\D/g, '');
    rules[key] = parseInt(rule.value);
  });
}

const nextGeneration = (last) => {
  if (last) {
    const result = new Array(last.length);
    for (let idx = 0; idx < last.length; idx++) {
      const leftIdx = idx > 0 ? idx - 1 : last.length - 1;
      const rightIdx = idx < last.length - 1 ? idx + 1 : 0;
      const key = `${last[leftIdx]}${last[idx]}${last[rightIdx]}`;
      result[idx] = rules[key];
    }
    return result;
  }
}

const last = (arr) => {
  return arr[arr.length - 1];
}

const startGenerativeAutomata = () => {
  generations.push(nextGeneration(last(generations)));

  setInterval(time => {
    generations.push(nextGeneration(last(generations)));

    if (generations.length > 8) generations.splice(0, 1);
    const generation = last(generations);

    // update on-screen mirror of what's happening on launchpad
    document.getElementById('generated').innerHTML = generations.join("<br>");;

    for (let y = 0; y < generations.length; y++) {
      for (let x = 0; x < generations[y].length; x++) {
        if (midiOutput) midiOutput.send([144, coordinateToMIDINote(x, y), generations[y][x] * (x + colorOffset)]); // Select
      }
    }
  }, 750);
}

var midiInput = null,
  midiOutput = null,
  grid = new Array(8);

// Create empty grid for Launchpad
for (let x = 0; x < 8; x++) {
  grid[x] = new Array(8);
}

// convert LaunchPad coordinate to MIDI note
const coordinateToMIDINote = (x, y) => {
  value = 88 - 7 + (x - (y * 10));
  return value;
}

// Clear the LaunchPad board
const resetBoard = () => {
  for (let x = 0; x < 8; x++) {
    grid[x] = [0, 0, 0, 0, 0, 0, 0, 0]
  }
  for (let i = 0; i < 127; i++) {
    if (midiOutput) midiOutput.send([144, i, 0]);
  }
}

const onMIDIInit = (midi) => {
  for (let input of midi.inputs.values()) {
    if (input.name === "Launchpad MK2") midiInput = input;
  }

  for (let output of midi.outputs.values()) {
    if (output.name === "Launchpad MK2") midiOutput = output;
  }

  if (midiInput) midiInput.onmidimessage = midiProc;

  resetBoard();

  if (midiInput) {
    midiOutput.send([0xB0, 0x00, 0x00]); // Reset Launchpad
    midiOutput.send([0xB0, 0x00, 0x01]); // Select XY mode
  }

  startGenerativeAutomata();
}

const onMIDIFail = () => {
  console.log("Could not load MIDI");
}

// Mess with the generative patterns
const midiProc = (event) => {
  const data = event.data,
    cmd = data[0] >> 4,
    noteNumber = data[1],
    parse = (noteNumber) / 10,
    // Map to X/Y values for LaunchPad MKII
    x = Math.abs((parseInt(parse.toString().split(".")[0]) - 1) - 7),
    y = parseInt(parse.toString().split(".")[1]) - 1;

  // clear row when pressing bottom right, off-grid button
  if (y === 8 && data[2] === 127) {
    generations[x].splice(0, 8, 0, 0, 0, 0, 0, 0, 0, 0);
  } else if ((generations[x][y] === undefined || generations[x][y] === 0) && data[2] == 127) {
    // toggle cell on
    generations[x].splice(y, 1, 1);
  } else if (generations[x][y] > 0 && data[2] == 127) {
    // toggle cell off
    generations[x].splice(y, 1, 0);
  }

  midiOutput.send([144, coordinateToMIDINote(y, x), generations[x][y] * (y + colorOffset)]); // Select
}

navigator.requestMIDIAccess({}).then(onMIDIInit, onMIDIFail);

document.querySelectorAll("input").forEach((rule) => {
  rule.addEventListener('change', updateRules);
});

updateRules();