import axios from 'axios';
import FormData from 'form-data';
import WebSocket from 'ws';

export class ComfyUIClient {
  ws = null; // No type annotation for ws

  // ------------------------------------------------------------
  constructor(generativeEndpoint, clientId) {
    this.generativeEndpoint = generativeEndpoint;
    this.clientId = clientId;
  }

  // ------------------------------------------------------------
  async connect() {
    return new Promise(async (resolve, reject) => {
      await this.disconnect();
      
      const url = `ws://${this.generativeEndpoint}/ws?clientId=${this.clientId}`;

      console.log(`Connecting to url: ${url}`);

      this.ws = new WebSocket(url, {
        perMessageDeflate: false,
      });

      this.ws.on('open', () => {
        console.log('Connection open');
        resolve();
      });

      this.ws.on('close', () => {
        console.log('Connection closed');
      });

      this.ws.on('error', (err) => {
        console.error({ err }, 'WebSockets error');
      });

      this.ws.on('message', (data, isBinary) => {
        if (!isBinary) {
          const jsonData = JSON.parse(data);
          switch(jsonData.type){
            case 'progress': 
              process.stdout.write(`${jsonData.data.max - jsonData.data.value} `);
              break;
            case 'executing':
              console.log(`executing: ${jsonData.data.node}`);
              break;
          }
        }
      });
    });
  }

  // ------------------------------------------------------------
  async disconnect() {
    if (this.ws) {
      await this.ws.close();
      this.ws = undefined;
    }
  }

  // ------------------------------------------------------------
  async queuePrompt(prompt) {
    return await axios.post(`http://${this.generativeEndpoint}/prompt`, {
      prompt,
      client_id: this.clientId
    }, {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      }
    })
    .then(res => {
      return res.data;
    })
    .catch(error => {
      console.error("Error: Prompt", error);
      return {success:false, error:error};
    });
  }

  // ------------------------------------------------------------
  async interrupt() {
    return await axios.post(`http://${this.generativeEndpoint}/interrupt`, null, {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      }
    })
    .then(res => {
      return {success:true, message:`interrupt`};
    })
    .catch(error => {
      return {success:false, error:error};
    });
  }

  // ------------------------------------------------------------
  async getHistory(promptId) {
    return await axios.get(`http://${this.generativeEndpoint}/history${promptId?'/'+promptId :''}`)
    .then(res => {
      return res.data[promptId];
    })
    .catch(error => {
      return {success:false, error:error};
    });
  }

  // ------------------------------------------------------------
  async uploadImage(image, filename, overwrite = true ) {
    const formData = new FormData();
    formData.append('image', image, filename);
    formData.append('overwrite', overwrite.toString());

    return await axios.post(`http://${this.generativeEndpoint}/upload/image`, formData, {
        headers: {
            ...formData.getHeaders(),
        },
    })
    .then(res => {
        return res.data;
    })
    .catch(error => {
        return {success:false, error:error};
    });
  }

  // ------------------------------------------------------------
  async uploadMask(image, filename, originalRef, overwrite = true) {
    const formData = new FormData();
    formData.append('image', image, filename);
    formData.append('originalRef', JSON.stringify(originalRef));
    formData.append('overwrite', overwrite.toString());

    return await axios.post(`http://${this.generativeEndpoint}/upload/mask`, formData, {
        headers: {
            ...formData.getHeaders(),
        },
    })
    .then(res => {
        return res.data;
    })
    .catch(error => {
        return {success:false, error:error};
    });
  }

  // ------------------------------------------------------------
  async getImage(filename, subfolder, type ) {
    const url = `http://${this.generativeEndpoint}/view?filename=${filename}&subfolder=${subfolder}&type=${type}`
    return await axios.get(url,{ responseType: 'arraybuffer' })
    .then(res => {
      return res.data;
    })
    .catch(error => {
      return {success:false, error:error};
    });
  }

  // ------------------------------------------------------------
  async getImages(prompt) {
    if (!this.ws) {
      throw new Error(
        'WebSocket client is not connected. Please call connect() before interacting.',
      );
    }

    const queue = await this.queuePrompt(prompt);
    const promptId = queue.prompt_id;

    return new Promise((resolve, reject) => {
      const outputImages = {};

      const onMessage = async (data, isBinary) => {
        if (isBinary) {
          return;
        }

        try {
          const message = JSON.parse(data.toString());
          const messageData = message.data;
          if (messageData.node || message.type != 'executing' || messageData.prompt_id != promptId) {
            return;
          }
          
          const history = await this.getHistory(promptId);
          for (const nodeId of Object.keys(history.outputs)) {
            const nodeOutput = history.outputs[nodeId];
            if (nodeOutput.images) {
              const imagesOutput = [];
              for (const image of nodeOutput.images) {
                if(image.type != 'output')
                  continue;

                const buffer = await this.getImage(
                  image.filename,
                  image.subfolder,
                  image.type,
                );
                imagesOutput.push({
                  buffer,
                  image,
                });
              }
              outputImages[nodeId] = imagesOutput;
            }
          }

          // Remove listener
          this.ws?.off('message', onMessage);
          return resolve(outputImages);
        } catch (err) {
          return reject(err);
        }
      };

      // Add listener
      this.ws?.on('message', onMessage);
    });
  }
}