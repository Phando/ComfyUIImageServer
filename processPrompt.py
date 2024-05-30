from PIL import Image
import io
import requests
import websocket
import json
import os
import sys
import uuid
import urllib.request
import urllib.parse

client_id = str(uuid.uuid4())
current_dir = os.getcwd()
comfy_address = "10.1.20.10:7861"
upload_address = "https://comfy-prompt-queue-576c22a1229d.herokuapp.com/saveImage"
promptName = sys.argv[1]  # Access the first argument (index 0 is the script name)
promptPath = os.path.join(current_dir, promptName)
prefix = sys.argv[2]

def queue_prompt(prompt):
    p = {"prompt": prompt, "client_id": client_id}
    data = json.dumps(p).encode('utf-8')
    req =  urllib.request.Request("http://{}/prompt".format(comfy_address), data=data)
    return json.loads(urllib.request.urlopen(req).read())

def get_image(filename, subfolder, folder_type):
    data = {"filename": filename, "subfolder": subfolder, "type": folder_type}
    url_values = urllib.parse.urlencode(data)
    with urllib.request.urlopen("http://{}/view?{}".format(comfy_address, url_values)) as response:
        return response.read()

def get_history(prompt_id):
    with urllib.request.urlopen("http://{}/history/{}".format(comfy_address, prompt_id)) as response:
        return json.loads(response.read())

def get_images(ws, prompt):
    prompt_id = queue_prompt(prompt)['prompt_id']
    output_images = {}
    while True:
        out = ws.recv()
        if isinstance(out, str):
            message = json.loads(out)
            if message['type'] == 'executing':
                data = message['data']
                if data['node'] is None and data['prompt_id'] == prompt_id:
                    break #Execution is done
        else:
            continue #previews are binary data

    history = get_history(prompt_id)[prompt_id]
    for o in history['outputs']:
        for node_id in history['outputs']:
            node_output = history['outputs'][node_id]
            if 'images' in node_output:
                images_output = []
                for image in node_output['images']:
                    if prefix in image['filename']:
                        print(image['filename'])
                        return get_image(image['filename'], image['subfolder'], image['type'])
                    image_data = get_image(image['filename'], image['subfolder'], image['type'])
                    images_output.append(image_data)
            output_images[node_id] = images_output

    return output_images

with open(promptPath, 'r') as file:
    prompt = json.load(file)

ws = websocket.WebSocket()
ws.connect("ws://{}/ws?clientId={}".format(comfy_address, client_id))
images = get_images(ws, prompt)
image = Image.open(io.BytesIO(images))
print("Got File")
image_bytes = image.tobytes()
image_file = io.BytesIO(image_bytes)
image_file.seek(0)  # Rewind the file pointer
print("Got Bytes")
files = {'image': image_file}
response = requests.post(upload_address, files=files)
print("Got Response")
print(response)