import express from 'express';
import axios from 'axios';

import { FerrariPromptHandler } from './ferrariPromptHandler.js';
import { MercedesPromptHandler } from './mercedesPromptHandler.js';

let interval = 10000;
let promptQueue = [];
let queueEndpoint = "https://comfy-prompt-queue-576c22a1229d.herokuapp.com";

global.currentPath = process.cwd();

const port = 7862;
const app = express();

const PromptHandlers = {
  FERRARI:'ferrari',
  MERCEDES:'mercedes'
};

let ferrariPromptHandler = new FerrariPromptHandler(queueEndpoint);
let mercedesPromptHandler = new MercedesPromptHandler(queueEndpoint);

// ------------------------------------------------------------
async function getState(){
  const response = await axios.get(queueEndpoint + "/getPrompt");
  console.log('Response data:', response.data);
  return response.data;
}

// ------------------------------------------------------------
async function generateImage(data){
  let instance = null;
  if(data?.api == null){
    console.error('Error: api not found in payload', data);
    return;
  }
      
  promptQueue.push(data);
  switch(data.api){
    case PromptHandlers.FERRARI:
      instance = ferrariPromptHandler;
      break;
    case PromptHandlers.MERCEDES:
      instance = mercedesPromptHandler;
      break
  }  

  if(instance == null){
    console.error(`Error: API '${data.api}' not found on server`);
    return;
  }

  const prompt = await instance.executePrompt(data);
  console.log("Image Generation Complete("+ data.id +")");
}


// ------------------------------------------------------------
async function pollEndpoint() {
  try {
    while (true) {
      const data = await getState();
      if ('prompt' in data) {
        await generateImage(data.prompt);
      }
      await new Promise((resolve) => setTimeout(resolve, interval)); // Wait for 10 seconds
    }
  } catch (error) {
    console.error('Error polling endpoint:', error);
  }
  pollEndpoint(); 
}

// ------------------------------------------------------------
app.use(express.json());
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
  pollEndpoint(); 
});
