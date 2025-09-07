from fastapi import FastAPI, File, UploadFile
from fastapi.responses import JSONResponse
from PIL import Image
import numpy as np
import tensorflow as tf
from io import BytesIO
import os


app = FastAPI()

CLASS_NAMES = [
    'Alambadi', 'Amritmahal', 'Ayrshire', 'Banni', 'Bargur', 'Bhadawari', 'Brown_Swiss',
    'Dangi', 'Deoni', 'Gir', 'Guernsey', 'Hallikar', 'Hariana', 'Holstein_Friesian',
    'Jaffrabadi', 'Jersey', 'Kangayam', 'Kankrej', 'Kasargod', 'Kenkatha', 'Kherigarh',
    'Khillari', 'Krishna_Valley', 'Malnad_gidda', 'Mehsana', 'Murrah', 'Nagori',
    'Nagpuri', 'Nili_Ravi', 'Nimari', 'Ongole', 'Pulikulam', 'Rathi', 'Red_Dane',
    'Red_Sindhi', 'Sahiwal', 'Surti', 'Tharparkar', 'Toda', 'Umblachery', 'Vechur'
]

model = None

def load_model():
    global model
    if model is None:
        model_path = r"C:\MLProject\CNN\BovinaBreedPrediction\AnimalModel1\model.h5"
        model = tf.keras.models.load_model(model_path)

       

@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    try:
        load_model()
        contents = await file.read()
        image = Image.open(BytesIO(contents)).convert("RGB")
        image = image.resize((256, 256))
        
        img_batch = tf.expand_dims(image, 0)

        predictions = model.predict(img_batch)
        predicted_class = CLASS_NAMES[np.argmax(predictions[0])]
        confidence = float(round(100 * np.max(predictions[0]), 2))

        return {"class": predicted_class, "confidence": confidence}

    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})
