import { PromptHandler } from "./promptHandler.js";

export class FerrariPromptHandler extends PromptHandler {
    backgrounds = [
        {name:"art",prompt:"large plaza, in front of a museum", image:"ferrariBackground1.png"},
        {name:"outdoor",prompt:"wide road, in a dramatic mountain environment", image:"ferrariBackground2.png"},
        {name:"gaming",prompt:"wide road, cyberpunk metropolis, futuristic cyberpunk scenario", image:"ferrariBackground3.png"}
    ]
    
    personas = [
        {name:"beastie",prompt:"a white male wearing street clothes", image:"ferrariPersona1.png"},
        {name:"beethoven",prompt:"Beethoven wearing a suit with tails", image:"ferrariPersona2.png"},
        {name:"chris",prompt:"a country singer", image:"ferrariPersona3.png"},
        {name:"metalica",prompt:"a rock star wearing leather", image:"ferrariPersona4.png"}
    ]
    
    vehicles = [
        {name:"Ferrari Roma", prompt:"red car", image:"ferrariVehicle1.png"},
        {name:"Ferrari Portofino M", prompt:"red convertible car", image:"ferrariVehicle2.png"},
        {name:"296 GTS", prompt:"blue convertible car", image:"ferrariVehicle3.png"},
        {name:"812 GTS", prompt:"gray convertible car", image:"ferrariVehicle4.png"},
        {name:"Ferrari Purosangue", prompt:"gray car", image:"ferrariVehicle5.png"},
        {name:"SF90 Stradale", prompt:"gray convertible car", image:"ferrariVehicle6.png"}
    ]

    // ------------------------------------------------------------
    constructor(queueEndpoint) {
        let asetPath = "assets/ferrari";
        super(queueEndpoint, asetPath);
        this.workflow = `${asetPath}/ferrariWorkflow.json`;
        this.recordEndpoint = "https://mercedes-llm-sic-23-demo.my.site.com/ferrariweb/services/apexrest/driveremail";
    }

    // ------------------------------------------------------------
    async encodePrompt(fileId, data){
        let jsonData = this.readJSON(this.workflow);
    
        jsonData["83"]["inputs"]["filename_prefix"] = "sicf_driver_" + fileId;
        jsonData["56"]["inputs"]["seed"] = this.getRandomInt(10000000000000,900000000000000);
        
        let background = this.safeGet(this.backgrounds, data.backgroundId-1);
        let persona = this.safeGet(this.personas, data.personaId-1);
        let vehicle = this.safeGet(this.vehicles, data.vehicleId-1);
     
        jsonData["28"]["inputs"]["image"] = background.image;
        jsonData["30"]["inputs"]["image"] = persona.image;
        jsonData["29"]["inputs"]["image"] = vehicle.image;
        jsonData["78"]["inputs"]["url"]   = data.selfieUrl;
    
        let promptString = "photo of " + persona.prompt + ", standing in front of a " + vehicle.prompt +", parked on a " + background.prompt +", (at noon:1.3)";
        jsonData["55"]["inputs"]["text_positive"] = promptString;
        return jsonData;
    }
}