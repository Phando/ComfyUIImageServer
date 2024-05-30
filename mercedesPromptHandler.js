import { PromptHandler } from "./promptHandler.js";

export class MercedesPromptHandler extends PromptHandler {
    backgrounds = [
        {name:"art",prompt:"large plaza, in front of a museum", image:"mercedesBackground1.png"},
        {name:"outdoor",prompt:"wide road, in a dramatic mountain environment", image:"mercedesBackground2.png"},
        {name:"gaming",prompt:"wide road, cyberpunk metropolis, futuristic cyberpunk scenario", image:"mercedesBackground3.png"}
    ]
    
    colors = [
        {color:"Patagonia Red", value:0.0},
        {color:"Copper Canyon", value:0.065},
        {color:"Sun Yellow", value:0.165},
        {color:"Starling Blue", value:0.63},
        {color:"Royal Iris", value:0.78}
    ]

    personas = [
        {name:"beastie",prompt:"a white male wearing street clothes", image:"mercedesPersona1.png"},
        {name:"beethoven",prompt:"Beethoven wearing a suit with tails", image:"mercedesPersona2.png"},
        {name:"chris",prompt:"a country singer", image:"mercedesPersona3.png"},
        {name:"metalica",prompt:"a rock star wearing leather", image:"mercedesPersona4.png"}
    ]

    // ------------------------------------------------------------
    constructor(queueEndpoint) {
        let asetPath = "assets/mercedes";
        super(queueEndpoint, asetPath);
        this.workflow = `${asetPath}/mercedesWorkflow.json`;
        this.recordEndpoint = "https://mercedes-llm-sic-23-demo.my.site.com/ferrariweb/services/apexrest/driveremail";
    }

    // ------------------------------------------------------------
    async encodePrompt(fileId, data){
        let jsonData = this.readJSON(this.workflow);
    
        jsonData["83"]["inputs"]["filename_prefix"] = "sicm_driver_" + fileId;
        jsonData["56"]["inputs"]["seed"] = this.getRandomInt(10000000000000,900000000000000);
        
        let background = this.safeGet(this.backgrounds, data.backgroundId-1);
        let persona = this.safeGet(this.personas, data.personaId-1);
        let color = this.safeGet(this.colors, data.colorId-1);
        
        jsonData["28"]["inputs"]["image"] = background.image;
        jsonData["122"]["inputs"]["hue_shift"] = color.value;
        jsonData["30"]["inputs"]["image"] = persona.image;
        jsonData["78"]["inputs"]["url"]   = data.selfieUrl;
    
        let promptString = "photo of " + persona.prompt + ", standing in front of a car, parked on a " + background.prompt +", (at noon:1.3)";
        jsonData["55"]["inputs"]["text_positive"] = promptString;
        return jsonData;
    }

}