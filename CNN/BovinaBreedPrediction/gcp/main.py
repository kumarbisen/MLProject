import logging
from fastapi import FastAPI, File, UploadFile
from fastapi.responses import JSONResponse
from google.cloud import storage
import tensorflow as tf
import numpy as np
from PIL import Image
import os

app = FastAPI()

BUCKET_NAME = "breed-classification-kumarbisen"
MODEL_FILE = "/tmp/model.h5"

class_names = [
    'Alambadi', 'Amritmahal', 'Ayrshire', 'Banni', 'Bargur', 'Bhadawari', 'Brown_Swiss',
    'Dangi', 'Deoni', 'Gir', 'Guernsey', 'Hallikar', 'Hariana', 'Holstein_Friesian',
    'Jaffrabadi', 'Jersey', 'Kangayam', 'Kankrej', 'Kasargod', 'Kenkatha', 'Kherigarh',
    'Khillari', 'Krishna_Valley', 'Malnad_gidda', 'Mehsana', 'Murrah', 'Nagori',
    'Nagpuri', 'Nili_Ravi', 'Nimari', 'Ongole', 'Pulikulam', 'Rathi', 'Red_Dane',
    'Red_Sindhi', 'Sahiwal', 'Surti', 'Tharparkar', 'Toda', 'Umblachery', 'Vechur'
]

model = None


def download_blob(bucket_name, source_blob_name, destination_file_name):
    """Downloads a blob from the bucket."""
    storage_client = storage.Client()
    bucket = storage_client.bucket(bucket_name)
    blob = bucket.blob(source_blob_name)
    blob.download_to_filename(destination_file_name)
    logging.info(f"Blob {source_blob_name} downloaded to {destination_file_name}.")


@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    global model
    if model is None:
        # Download model only once
        download_blob(
            BUCKET_NAME,
            "models/model.h5",
            MODEL_FILE,
        )
        model = tf.keras.models.load_model(MODEL_FILE)

    # Read image
    image = Image.open(file.file).convert("RGB").resize((256, 256))
    image = np.array(image)

    # Preprocess
    img_array = tf.expand_dims(image, 0)
    predictions = model.predict(img_array)

    predicted_class = class_names[np.argmax(predictions[0])]
    confidence = float(round(100 * (np.max(predictions[0])), 2))

    return JSONResponse(content={
        "class": predicted_class,
        "confidence": confidence
    })
