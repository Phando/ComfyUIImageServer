import { PromptHandler } from "./promptHandler.js";

export class GenericPromptHandler extends PromptHandler {
    
    // ------------------------------------------------------------
    constructor(queueEndpoint) {
        let asetPath = "assets/generic";
        super(queueEndpoint, asetPath);
        this.workflow = `${asetPath}/genericWorkflow.json`;
    }

    // ------------------------------------------------------------
    async encodePrompt(fileId, data){
        let jsonData = this.readJSON(this.workflow);
    
        jsonData["9"]["inputs"]["filename_prefix"] = "ComfyImageServer_" + fileId;
        jsonData["14"]["inputs"]["seed"] = this.getRandomInt(10000000000000,900000000000000);
    
        jsonData["23"]["inputs"]["text"] = data.prompt;
        return jsonData;
    }
}