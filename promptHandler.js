import axios from 'axios';
import fs from 'fs';
import FormData from 'form-data';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { ComfyUIClient } from './comfyUIClient.js';

export class PromptHandler {
    workflow = "";
    
    // ------------------------------------------------------------
    constructor(queueEndpoint, assetPath) {
        this.clientId = uuidv4();
        this.imageEndpoint = "COMFYUI SERVER:PORT";
        this.queueEndpoint = queueEndpoint;
        this.client = new ComfyUIClient(this.imageEndpoint, this.clientId);
        this.preprareAssets(assetPath);
    }

    // ------------------------------------------------------------
    async encodePrompt(data){
        throw new Error("encodePrompt not implemented");
    }

    // ------------------------------------------------------------
    async preprareAssets(assetPath){
        console.log("preprareAssets");
        try {
            assetPath = path.join(process.cwd(), assetPath);
            const files = fs.readdirSync(assetPath);
            for (const fileName of files) {
                if(!fileName.includes('.png')){
                    continue;
                }
                
                const filePath = path.join(assetPath, fileName);
                const imageBuffer = fs.readFileSync(filePath);
                
                let response;
                if(fileName.includes('Mask')){
                    // response = await this.client.uploadMask(imageBuffer, fileName, originalRef);
                }
                else {
                    response = await this.client.uploadImage(imageBuffer, fileName);
                }
                
                console.log(`Uploaded: ${fileName} - Status:`, response);
            }
            console.log('All images uploaded successfully.');
        } catch (error) {
            console.error('Error uploading images:', error);
        }
    }

    // ------------------------------------------------------------
    safeGet(array, index) {
        if (Array.isArray(array) && index >= 0 && index < array.length) {
            return array[index];
        }
        console.error(`Error: Index [${index}] out of bounds for array:`, array);
        return array[0];
    }

    // ------------------------------------------------------------
    getRandomInt(min, max) {
        if (min > max) {
            [min, max] = [max, min]; // Swap values
        }

        const randomDecimal = Math.random();
        return Math.floor(randomDecimal * (max - min + 1) + min);
    }

    // ------------------------------------------------------------
    readJSON(filePath){
        try {
            const data = fs.readFileSync(filePath, 'utf8');
            const jsonData = JSON.parse(data);
            return jsonData;
        } catch (err) {
            console.error("Error reading or parsing file:", err);
        }
    }

    // ------------------------------------------------------------
    async uploadImage(imageData){
        console.log(imageData);
        const formData = new FormData();
        formData.append('image', imageData.buffer, {filename: imageData.image.filename});

        return await axios.post(this.queueEndpoint + "/saveImage", formData, {
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
    async queuePrompt(data) {
        let fileId = Math.round(+new Date()/1000);
        const jsonData = await this.encodePrompt(fileId, data);
        
        await this.client.connect();
        const images = await this.client.getImages(jsonData);
        await this.client.disconnect();
        if("success" in images && !images.success){
            return images;
        }
        return Object.values(images).flatMap(itemArray => itemArray).find(item => item.image.filename.includes(fileId));
    }

    // ------------------------------------------------------------
    async executePrompt(data){
        try{
            const imageData = await this.queuePrompt(data);
            if("success" in imageData && !imageData.success){
                console.error("Error in queue:", imageData);
                return imageData;
            }
            console.log(imageData);
            let res = await this.uploadImage(imageData);
            imageData.image.imageURL = this.queueEndpoint + "/images/" + imageData.image.filename;
            console.log("Uploaded Image:\n", imageData);
            return {success:true, id:data.id, message:`Successfully executed prompt: ${data.id}`, imageData:imageData};
        } catch (err) {
            console.error("Error reading or parsing file:", err);
        }
    }
  }
  